import type { LucideIcon } from 'lucide-react';

export type AgentId = 'planner' | 'designer' | 'backend' | 'reviewer' | 'tester';
export type AgentStatus = 'idle' | 'running' | 'completed' | 'error' | 'paused' | 'blocked';
export type PipelinePhase = 0 | 1 | 2 | 3 | 4;

export interface AgentConfig {
  id: AgentId;
  name: string;
  icon: LucideIcon;
  role: string;
  color: string;
}

export interface StatusStyle {
  label: string;
  bgClass: string;
  borderClass: string;
  dotClass: string;
  pulse: boolean;
  labelColor: string;
}

export interface PipelineLog {
  time: string;
  agent: AgentId;
  msg: string;
}

// Feedback types
export type FeedbackSeverity = 'info' | 'warning' | 'blocking';
export type FeedbackAction = 'redispatch' | 'note';

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
}

export interface StreamChunk {
  agentId: AgentId;
  text: string;
  done: boolean;
}

export interface PipelineScenario {
  name: string;
  state: Record<AgentId, AgentStatus>;
  phase: PipelinePhase;
  iterations: number;
  maxIterations: number;
  status: string;
  request: string;
  logs: PipelineLog[];
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
  logs: PipelineLog[];
  feedback: FeedbackEntry[];
  outputs: Partial<Record<AgentId, AgentOutput>>;
}
