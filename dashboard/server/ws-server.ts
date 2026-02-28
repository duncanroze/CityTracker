import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import type {
  AgentId,
  PipelinePhase,
  PipelineState,
  PipelineLogEntry,
  PipelineRun,
  FeedbackEntry,
  FeedbackPayload,
  StateUpdatePayload,
  LogPayload,
  ScorePayload,
  WsMessage,
} from './protocol.js';

const PORT = parseInt(process.env.WS_PORT ?? '3002', 10);
const VALID_AGENTS = ['planner', 'designer', 'backend', 'reviewer', 'tester'] as const;
const AUTO_RESET_DELAY = 8000;
const HISTORY_FILE = path.join(import.meta.dirname ?? '.', 'pipeline-history.json');

const AGENT_PHASE: Record<AgentId, PipelinePhase> = {
  planner: 1,
  designer: 2,
  backend: 2,
  reviewer: 3,
  tester: 4,
};

// Dependency graph: each agent lists which agents must be completed before it can start
const AGENT_DEPS: Record<AgentId, AgentId[]> = {
  planner: [],
  designer: ['planner'],
  backend: ['planner'],
  reviewer: ['designer', 'backend'],
  tester: ['reviewer'],
};

const PHASE_STATUS: Record<PipelinePhase, string> = {
  0: 'idle',
  1: 'planning',
  2: 'executing',
  3: 'reviewing',
  4: 'testing',
};

const DEFAULT_STATE: PipelineState = {
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
};

// --- Persistent history ---
function loadHistory(): { runs: PipelineRun[]; nextId: number } {
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
    const data = JSON.parse(raw) as PipelineRun[];
    const maxId = data.reduce((m, r) => Math.max(m, r.id), 0);
    return { runs: data, nextId: maxId + 1 };
  } catch {
    return { runs: [], nextId: 1 };
  }
}

function saveHistory(runs: PipelineRun[]) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(runs, null, 2));
  } catch (err) {
    console.error('[ws] Failed to persist history:', err);
  }
}

const loaded = loadHistory();
let currentState: PipelineState = structuredClone(DEFAULT_STATE);
let logs: PipelineLogEntry[] = [];
let feedbackEntries: FeedbackEntry[] = [];
let feedbackIdCounter = 0;
const runs: PipelineRun[] = loaded.runs;
let runIdCounter = loaded.nextId - 1;
let startTimestamp: number | null = null;
let autoResetTimer: ReturnType<typeof setTimeout> | null = null;

function broadcast(msg: WsMessage) {
  const payload = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function now(): string {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':');
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function markStartIfNeeded() {
  if (!startTimestamp && currentState.status !== 'idle') {
    startTimestamp = Date.now();
    currentState.startedAt = now();
  }
}

function autoProgress() {
  if (!currentState.autoApprove) return;

  let changed = false;
  for (const agent of VALID_AGENTS) {
    if (currentState.state[agent] !== 'idle') continue;
    const deps = AGENT_DEPS[agent];
    // Skip agents whose dependencies are all idle (not participating)
    if (deps.length > 0 && deps.every(d => currentState.state[d] === 'idle')) continue;
    // Start agent if all deps are completed
    const allDepsDone = deps.every(d => currentState.state[d] === 'completed');
    if (deps.length === 0 || allDepsDone) {
      currentState.state[agent] = 'running';
      currentState.phase = AGENT_PHASE[agent];
      currentState.status = PHASE_STATUS[AGENT_PHASE[agent]];
      changed = true;

      const logEntry: PipelineLogEntry = {
        time: now(),
        agent,
        msg: `[AUTO] Demarrage automatique (dependances satisfaites)`,
      };
      logs.push(logEntry);
      broadcast({ type: 'log', data: logEntry });
    }
  }

  if (changed) {
    markStartIfNeeded();
    broadcast({ type: 'state', data: structuredClone(currentState) });
  }
}

function checkPipelineComplete() {
  if (currentState.status === 'idle') return;
  const statuses = Object.values(currentState.state);
  const activeStatuses = statuses.filter(s => s !== 'idle');
  if (activeStatuses.length === 0) return;
  const allDone = activeStatuses.every(s => s === 'completed' || s === 'error');
  if (!allDone) return;

  const hasError = statuses.some(s => s === 'error');
  const endedAt = now();
  const durationMs = startTimestamp ? Date.now() - startTimestamp : 0;

  runIdCounter++;
  const run: PipelineRun = {
    id: runIdCounter,
    request: currentState.request,
    startedAt: currentState.startedAt ?? endedAt,
    endedAt,
    durationMs,
    scores: { ...currentState.scores },
    status: hasError ? 'error' : 'completed',
    logCount: logs.length,
    iterations: currentState.iterations,
    feedbackCount: feedbackEntries.length,
    logs: [...logs],
    feedback: [...feedbackEntries],
  };
  runs.push(run);
  saveHistory(runs);
  broadcast({ type: 'history', data: [...runs] });

  // Auto-reset after delay
  if (autoResetTimer) clearTimeout(autoResetTimer);
  autoResetTimer = setTimeout(() => {
    currentState = structuredClone(DEFAULT_STATE);
    logs = [];
    feedbackEntries = [];
    feedbackIdCounter = 0;
    startTimestamp = null;
    broadcast({ type: 'reset' });
    console.log(`[ws] Pipeline auto-reset after run #${run.id}`);
  }, AUTO_RESET_DELAY);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  try {
    if (url.pathname === '/api/health' && req.method === 'GET') {
      json(res, 200, { ok: true, clients: wss.clients.size });
    } else if (url.pathname === '/api/history' && req.method === 'GET') {
      json(res, 200, runs);
    } else if (url.pathname === '/api/state' && req.method === 'POST') {
      if (autoResetTimer) { clearTimeout(autoResetTimer); autoResetTimer = null; }

      const body: StateUpdatePayload = JSON.parse(await readBody(req));
      if (body.state) Object.assign(currentState.state, body.state);
      if (body.phase !== undefined) currentState.phase = body.phase;
      if (body.iterations !== undefined) currentState.iterations = body.iterations;
      if (body.maxIterations !== undefined) currentState.maxIterations = body.maxIterations;
      if (body.status !== undefined) currentState.status = body.status;
      if (body.request !== undefined) currentState.request = body.request;
      if (body.autoApprove !== undefined) currentState.autoApprove = body.autoApprove;
      markStartIfNeeded();
      broadcast({ type: 'state', data: structuredClone(currentState) });
      autoProgress();
      checkPipelineComplete();
      json(res, 200, { ok: true });
    } else if (url.pathname === '/api/log' && req.method === 'POST') {
      const body: LogPayload = JSON.parse(await readBody(req));
      const entry: PipelineLogEntry = { time: now(), agent: body.agent, msg: body.msg };
      logs.push(entry);
      broadcast({ type: 'log', data: entry });
      json(res, 200, { ok: true });
    } else if (url.pathname === '/api/score' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req)) as ScorePayload;
      if (!VALID_AGENTS.includes(body.agent as typeof VALID_AGENTS[number]) || typeof body.score !== 'number' || isNaN(body.score)) {
        json(res, 400, { error: 'Invalid agent or score' });
        return;
      }
      currentState.scores[body.agent] = Math.max(0, Math.min(100, body.score));
      broadcast({ type: 'state', data: structuredClone(currentState) });
      autoProgress();
      checkPipelineComplete();
      json(res, 200, { ok: true });
    } else if (url.pathname === '/api/feedback' && req.method === 'POST') {
      const body: FeedbackPayload = JSON.parse(await readBody(req));

      if (!body.from || !body.target || !body.message || !body.action || !body.severity) {
        json(res, 400, { error: 'Missing required fields: from, target, action, severity, message' });
        return;
      }
      if (!VALID_AGENTS.includes(body.from as typeof VALID_AGENTS[number])) {
        json(res, 400, { error: `Invalid from agent: ${body.from}` });
        return;
      }

      const targets = (Array.isArray(body.target) ? body.target : [body.target]) as AgentId[];
      for (const t of targets) {
        if (!VALID_AGENTS.includes(t as typeof VALID_AGENTS[number])) {
          json(res, 400, { error: `Invalid target agent: ${t}` });
          return;
        }
      }

      feedbackIdCounter++;
      const entry: FeedbackEntry = {
        id: feedbackIdCounter,
        time: now(),
        from: body.from,
        target: targets,
        action: body.action,
        severity: body.severity,
        message: body.message,
        iteration: currentState.iterations,
      };
      feedbackEntries.push(entry);
      currentState.feedback.push(entry);

      broadcast({ type: 'feedback', data: entry });

      const targetNames = targets.join(', ');
      const logEntry: PipelineLogEntry = {
        time: now(),
        agent: body.from,
        msg: `[FEEDBACK → ${targetNames}] ${body.severity.toUpperCase()}: ${body.message}`,
      };
      logs.push(logEntry);
      broadcast({ type: 'log', data: logEntry });

      if (body.action === 'redispatch') {
        if (currentState.iterations >= currentState.maxIterations) {
          const warnLog: PipelineLogEntry = {
            time: now(),
            agent: body.from,
            msg: `[ITERATION LIMIT] Max ${currentState.maxIterations} iterations reached. No re-dispatch.`,
          };
          logs.push(warnLog);
          broadcast({ type: 'log', data: warnLog });
          json(res, 200, { ok: true, redispatched: false, reason: 'max_iterations_reached', feedback: entry });
          return;
        }

        if (autoResetTimer) { clearTimeout(autoResetTimer); autoResetTimer = null; }

        currentState.iterations++;
        for (const t of targets) currentState.state[t] = 'running';

        // Reset downstream agents transitively: any agent that depends (directly or
        // indirectly) on a target must be reset to idle so it re-runs after the target.
        const resetSet = new Set<AgentId>(targets);
        let changed = true;
        while (changed) {
          changed = false;
          for (const agent of VALID_AGENTS) {
            if (resetSet.has(agent)) continue;
            const deps = AGENT_DEPS[agent];
            if (deps.some(d => resetSet.has(d)) && currentState.state[agent] !== 'idle') {
              currentState.state[agent] = 'idle';
              resetSet.add(agent);
              changed = true;
            }
          }
        }

        const earliestPhase = Math.min(...targets.map(t => AGENT_PHASE[t])) as PipelinePhase;
        currentState.phase = earliestPhase;
        currentState.status = 'redispatching';

        broadcast({ type: 'state', data: structuredClone(currentState) });

        const rdLog: PipelineLogEntry = {
          time: now(),
          agent: body.from,
          msg: `[REDISPATCH] Iteration ${currentState.iterations}/${currentState.maxIterations} — re-running: ${targetNames}`,
        };
        logs.push(rdLog);
        broadcast({ type: 'log', data: rdLog });

        json(res, 200, { ok: true, redispatched: true, iteration: currentState.iterations, feedback: entry });
      } else {
        json(res, 200, { ok: true, redispatched: false, feedback: entry });
      }
    } else if (url.pathname === '/api/reset' && req.method === 'POST') {
      if (autoResetTimer) { clearTimeout(autoResetTimer); autoResetTimer = null; }
      currentState = structuredClone(DEFAULT_STATE);
      logs = [];
      feedbackEntries = [];
      feedbackIdCounter = 0;
      startTimestamp = null;
      broadcast({ type: 'reset' });
      json(res, 200, { ok: true });
    } else {
      json(res, 404, { error: 'Not found' });
    }
  } catch (err) {
    json(res, 400, { error: 'Invalid request body' });
  }
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'state', data: currentState } satisfies WsMessage));
  for (const log of logs) {
    ws.send(JSON.stringify({ type: 'log', data: log } satisfies WsMessage));
  }
  for (const fb of feedbackEntries) {
    ws.send(JSON.stringify({ type: 'feedback', data: fb } satisfies WsMessage));
  }
  if (runs.length > 0) {
    ws.send(JSON.stringify({ type: 'history', data: runs } satisfies WsMessage));
  }
  console.log(`[ws] Client connected (${wss.clients.size} total)`);
  ws.on('close', () => console.log(`[ws] Client disconnected (${wss.clients.size} total)`));
});

server.listen(PORT, () => {
  console.log(`[ws] Pipeline WS server on http://localhost:${PORT}`);
  console.log(`[ws]   POST /api/state   — update pipeline state`);
  console.log(`[ws]   POST /api/log     — append log entry`);
  console.log(`[ws]   POST /api/score   — update agent score`);
  console.log(`[ws]   POST /api/feedback — post review feedback (triggers re-dispatch)`);
  console.log(`[ws]   POST /api/reset   — reset pipeline`);
  console.log(`[ws]   GET  /api/health  — health check`);
  console.log(`[ws]   GET  /api/history — pipeline run history`);
});
