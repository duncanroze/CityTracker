import { streamAgent, parseScore, parseRedispatches, parseAgentScores } from './claude-client.js';
import type {
  AgentId,
  AgentOutput,
  StreamChunk,
  PipelineState,
  PipelineLogEntry,
  FeedbackEntry,
  PipelinePhase,
} from './protocol.js';

const VALID_AGENTS: AgentId[] = ['planner', 'designer', 'backend', 'reviewer', 'tester'];

const AGENT_DEPS: Record<AgentId, AgentId[]> = {
  planner: [],
  designer: ['planner'],
  backend: ['planner'],
  reviewer: ['designer', 'backend'],
  tester: ['reviewer'],
};

const AGENT_PHASE: Record<AgentId, PipelinePhase> = {
  planner: 1,
  designer: 2,
  backend: 2,
  reviewer: 3,
  tester: 4,
};

export interface OrchestratorCallbacks {
  onStateChange: (state: PipelineState) => void;
  onLog: (entry: PipelineLogEntry) => void;
  onFeedback: (entry: FeedbackEntry) => void;
  onStreamChunk: (chunk: StreamChunk) => void;
  onPlanReady: (plan: string) => void;
  onComplete: () => void;
}

function now(): string {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':');
}

export class PipelineOrchestrator {
  private state: PipelineState;
  private outputs: Record<string, AgentOutput> = {};
  private feedbackEntries: FeedbackEntry[] = [];
  private feedbackIdCounter = 0;
  private callbacks: OrchestratorCallbacks;
  private userRequest = '';
  private approvedPlan: string | null = null;
  private planResolve: ((plan: string) => void) | null = null;

  constructor(callbacks: OrchestratorCallbacks) {
    this.callbacks = callbacks;
    this.state = this.createIdleState();
  }

  private createIdleState(): PipelineState {
    return {
      state: { planner: 'idle', designer: 'idle', backend: 'idle', reviewer: 'idle', tester: 'idle' },
      phase: 0,
      iterations: 0,
      maxIterations: 3,
      status: 'idle',
      request: "En attente d'une demande...",
      scores: { planner: 0, designer: 0, backend: 0, reviewer: 0, tester: 0 },
      autoApprove: true,
      startedAt: null,
      feedback: [],
      outputs: {},
      pendingPlan: null,
    };
  }

  getState(): PipelineState {
    return structuredClone(this.state);
  }

  getOutputs(): Partial<Record<AgentId, AgentOutput>> {
    return { ...this.outputs };
  }

  getFeedback(): FeedbackEntry[] {
    return [...this.feedbackEntries];
  }

  async startPipeline(request: string): Promise<void> {
    this.userRequest = request;
    this.outputs = {};
    this.feedbackEntries = [];
    this.feedbackIdCounter = 0;
    this.approvedPlan = null;

    this.state = this.createIdleState();
    this.state.request = request;
    this.state.status = 'planning';
    this.state.startedAt = now();
    this.state.state.planner = 'running';
    this.state.phase = 1;

    this.broadcastState();

    // Run planner first
    await this.runAgent('planner');

    // After planner completes, pause for plan approval
    if (this.outputs.planner) {
      this.state.status = 'awaiting_approval';
      this.state.pendingPlan = this.outputs.planner.content;
      this.broadcastState();
      this.callbacks.onPlanReady(this.outputs.planner.content);
      this.log('planner', 'Plan pret — en attente de validation utilisateur');

      // Wait for user approval
      const approvedPlan = await new Promise<string>((resolve) => {
        this.planResolve = resolve;
      });

      this.approvedPlan = approvedPlan;
      this.state.pendingPlan = null;
      this.state.status = 'executing';
      this.broadcastState();
      this.log('planner', 'Plan valide — lancement de l\'execution');

      // Run designer + backend in parallel
      await this.runParallelPhase(['designer', 'backend']);

      // Run reviewer
      if (this.shouldContinue()) {
        await this.runAgent('reviewer');
        await this.handleRedispatches('reviewer');
      }

      // Run tester
      if (this.shouldContinue()) {
        await this.runAgent('tester');
        await this.handleRedispatches('tester');
      }
    }

    this.callbacks.onComplete();
  }

  approvePlan(plan: string): void {
    if (this.planResolve) {
      this.planResolve(plan);
      this.planResolve = null;
    }
  }

  rejectPlan(): void {
    // Reset pipeline on rejection
    this.state = this.createIdleState();
    this.broadcastState();
    this.log('planner', 'Plan rejete — pipeline annule');
    if (this.planResolve) {
      // We need to handle this — we'll resolve with empty to let the pipeline end
      this.planResolve('__REJECTED__');
      this.planResolve = null;
    }
  }

  private shouldContinue(): boolean {
    const hasError = Object.values(this.state.state).some(s => s === 'error');
    return !hasError && this.state.status !== 'idle';
  }

  private async runParallelPhase(agents: AgentId[]): Promise<void> {
    this.state.phase = AGENT_PHASE[agents[0]];
    this.state.status = 'executing';
    for (const agent of agents) {
      this.state.state[agent] = 'running';
    }
    this.broadcastState();

    await Promise.all(agents.map(agent => this.runAgent(agent)));
  }

  private async runAgent(agentId: AgentId): Promise<void> {
    this.state.state[agentId] = 'running';
    this.state.phase = AGENT_PHASE[agentId];
    this.broadcastState();
    this.log(agentId, `Demarrage de ${agentId}...`);

    const context = this.buildContext(agentId);

    try {
      await streamAgent(agentId, this.userRequest, context, {
        onChunk: (chunk) => {
          this.callbacks.onStreamChunk(chunk);
        },
        onToolUse: (agent, tool, detail) => {
          this.log(agent, `[TOOL] ${tool}${detail ? ` — ${detail}` : ''}`);
        },
        onComplete: (output) => {
          this.outputs[agentId] = output;
          this.state.state[agentId] = 'completed';
          this.state.outputs[agentId] = output;

          // Parse and set scores
          const score = parseScore(output.content);
          if (score > 0) {
            this.state.scores[agentId] = score;
          }

          // For reviewer, also parse individual agent scores
          if (agentId === 'reviewer') {
            const agentScores = parseAgentScores(output.content);
            for (const [agent, s] of Object.entries(agentScores)) {
              this.state.scores[agent as AgentId] = s;
            }
          }

          this.broadcastState();
          this.log(agentId, `Termine (${(output.durationMs / 1000).toFixed(1)}s, score: ${score || 'N/A'})`);
        },
        onError: (error) => {
          this.state.state[agentId] = 'error';
          this.broadcastState();
          this.log(agentId, `Erreur: ${error}`);
        },
      });
    } catch (err) {
      this.state.state[agentId] = 'error';
      this.broadcastState();
      this.log(agentId, `Erreur fatale: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  private async handleRedispatches(fromAgent: AgentId): Promise<void> {
    const output = this.outputs[fromAgent];
    if (!output) return;

    const redispatches = parseRedispatches(output.content);
    if (redispatches.length === 0) return;

    if (this.state.iterations >= this.state.maxIterations) {
      this.log(fromAgent, `[ITERATION LIMIT] Max ${this.state.maxIterations} atteint. Pas de redispatch.`);
      return;
    }

    this.state.iterations++;
    const targets = redispatches.map(r => r.target);
    const uniqueTargets = [...new Set(targets)];

    // Create feedback entries
    for (const rd of redispatches) {
      this.feedbackIdCounter++;
      const entry: FeedbackEntry = {
        id: this.feedbackIdCounter,
        time: now(),
        from: fromAgent,
        target: [rd.target],
        action: 'redispatch',
        severity: 'blocking',
        message: rd.reason,
        iteration: this.state.iterations,
      };
      this.feedbackEntries.push(entry);
      this.state.feedback.push(entry);
      this.callbacks.onFeedback(entry);
    }

    this.log(fromAgent, `[REDISPATCH] Iteration ${this.state.iterations}/${this.state.maxIterations} — re-run: ${uniqueTargets.join(', ')}`);

    // Reset targets and downstream agents
    const resetSet = new Set<AgentId>(uniqueTargets);
    let changed = true;
    while (changed) {
      changed = false;
      for (const agent of VALID_AGENTS) {
        if (resetSet.has(agent)) continue;
        const deps = AGENT_DEPS[agent];
        if (deps.some(d => resetSet.has(d))) {
          resetSet.add(agent);
          changed = true;
        }
      }
    }

    for (const agent of resetSet) {
      this.state.state[agent] = 'idle';
      delete this.outputs[agent];
      delete this.state.outputs[agent];
    }

    this.broadcastState();

    // Re-run the redispatched agents
    // Group by phase for parallel execution
    const phase2Agents = uniqueTargets.filter(a => AGENT_PHASE[a] === 2);
    const otherAgents = uniqueTargets.filter(a => AGENT_PHASE[a] !== 2);

    if (phase2Agents.length > 0) {
      await this.runParallelPhase(phase2Agents);
    }
    for (const agent of otherAgents) {
      if (this.shouldContinue()) {
        await this.runAgent(agent);
      }
    }

    // Re-run downstream agents that were reset
    for (const agent of VALID_AGENTS) {
      if (resetSet.has(agent) && !uniqueTargets.includes(agent) && this.shouldContinue()) {
        const deps = AGENT_DEPS[agent];
        const allDepsDone = deps.every(d => this.state.state[d] === 'completed');
        if (allDepsDone) {
          await this.runAgent(agent);
          // Check for further redispatches from reviewer/tester
          if (agent === 'reviewer' || agent === 'tester') {
            await this.handleRedispatches(agent);
          }
        }
      }
    }
  }

  private buildContext(agentId: AgentId): string {
    const parts: string[] = [];

    // Add approved plan if available (for all agents except planner)
    if (agentId !== 'planner' && this.approvedPlan) {
      parts.push(`=== Plan approuve ===\n${this.approvedPlan}`);
    }

    // Add dependency outputs
    const deps = AGENT_DEPS[agentId];
    for (const dep of deps) {
      const output = this.outputs[dep];
      if (output) {
        parts.push(`=== Output ${dep} ===\n${output.content}`);
      }
    }

    // For reviewer/tester: add all previous outputs
    if (agentId === 'reviewer' || agentId === 'tester') {
      for (const agent of VALID_AGENTS) {
        if (agent === agentId) continue;
        const output = this.outputs[agent];
        if (output && !deps.includes(agent)) {
          parts.push(`=== Output ${agent} ===\n${output.content}`);
        }
      }
    }

    // Add feedback from previous iterations
    const relevantFeedback = this.feedbackEntries.filter(
      f => f.target.includes(agentId) && f.action === 'redispatch'
    );
    if (relevantFeedback.length > 0) {
      parts.push(`=== Feedback des iterations precedentes ===`);
      for (const fb of relevantFeedback) {
        parts.push(`[${fb.from}] ${fb.severity}: ${fb.message}`);
      }
    }

    return parts.join('\n\n');
  }

  private broadcastState(): void {
    this.callbacks.onStateChange(structuredClone(this.state));
  }

  private log(agent: AgentId, msg: string): void {
    this.callbacks.onLog({ time: now(), agent, msg });
  }
}
