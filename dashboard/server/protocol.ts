export type AgentId = 'planner' | 'designer' | 'backend' | 'reviewer' | 'tester';
export type AgentStatus = 'idle' | 'running' | 'completed' | 'error' | 'paused' | 'blocked';
export type PipelinePhase = 0 | 1 | 2 | 3 | 4;

// Feedback types
export type FeedbackSeverity = 'info' | 'warning' | 'blocking';
export type FeedbackAction = 'redispatch' | 'note';

export interface FeedbackPayload {
  from: AgentId;
  target: AgentId | AgentId[];
  action: FeedbackAction;
  severity: FeedbackSeverity;
  message: string;
}

export interface FeedbackEntry {
  id: number;
  time: string;
  from: AgentId;
  target: AgentId[];
  action: FeedbackAction;
  severity: FeedbackSeverity;
  message: string;
  iteration: number;
}

export interface AgentOutput {
  agentId: AgentId;
  content: string;
  durationMs: number;
  completedAt: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface StreamChunk {
  agentId: AgentId;
  text: string;
  done: boolean;
}

export interface PipelineState {
  state: Record<AgentId, AgentStatus>;
  phase: PipelinePhase;
  iterations: number;
  maxIterations: number;
  status: string;
  request: string;
  scores: Record<AgentId, number>;
  autoApprove: boolean;
  startedAt: string | null;
  feedback: FeedbackEntry[];
  outputs: Partial<Record<AgentId, AgentOutput>>;
  pendingPlan: string | null;
}

export interface PipelineRun {
  id: number;
  request: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  scores: Record<AgentId, number>;
  status: 'completed' | 'error';
  logCount: number;
  iterations: number;
  feedbackCount: number;
  logs: PipelineLogEntry[];
  feedback: FeedbackEntry[];
  outputs: Partial<Record<AgentId, AgentOutput>>;
}

export interface PipelineLogEntry {
  time: string;
  agent: AgentId;
  msg: string;
}

// WS messages: server → client
export type WsMessage =
  | { type: 'state'; data: PipelineState }
  | { type: 'log'; data: PipelineLogEntry }
  | { type: 'feedback'; data: FeedbackEntry }
  | { type: 'history'; data: PipelineRun[] }
  | { type: 'stream'; data: StreamChunk }
  | { type: 'plan_ready'; data: { plan: string } }
  | { type: 'reset' };

// WS messages: client → server
export type WsClientMessage =
  | { type: 'chat'; data: { message: string } }
  | { type: 'approve_plan'; data: { plan: string } }
  | { type: 'reject_plan' };

// HTTP POST payloads
export interface StateUpdatePayload {
  state?: Partial<Record<AgentId, AgentStatus>>;
  phase?: PipelinePhase;
  iterations?: number;
  maxIterations?: number;
  status?: string;
  request?: string;
  autoApprove?: boolean;
}

export interface ScorePayload {
  agent: AgentId;
  score: number;
  reason?: string;
}

export interface LogPayload {
  agent: AgentId;
  msg: string;
}
