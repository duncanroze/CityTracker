import { cn } from '../lib/utils';
import { AGENTS } from '../lib/config';
import { RotateCcw } from 'lucide-react';
import AgentCard from './AgentCard';
import type { AgentId, AgentStatus, PipelineLog, FeedbackEntry, AgentOutput } from '../lib/types';

interface PipelineViewProps {
  state: Record<string, AgentStatus>;
  scores?: Record<AgentId, number>;
  logs?: PipelineLog[];
  feedback?: FeedbackEntry[];
  outputs?: Partial<Record<AgentId, AgentOutput>>;
  onAgentClick?: (id: AgentId) => void;
}

function ConnectionLine({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center py-0.5">
      <div
        className={cn(
          'h-4 w-0.5 rounded-sm transition-colors duration-300',
          active
            ? 'bg-gradient-to-b from-amber-500 to-amber-500/50'
            : 'bg-border',
        )}
      />
    </div>
  );
}

function FeedbackArrow({ from, targets }: { from: AgentId; targets: AgentId[] }) {
  return (
    <div className="flex items-center justify-center py-1">
      <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/8 px-2.5 py-1 text-[10px] font-semibold text-amber-500 animate-in fade-in duration-300">
        <RotateCcw className="h-3 w-3" />
        <span>{from} → {targets.join(', ')}</span>
      </div>
    </div>
  );
}

export default function PipelineView({ state, scores, logs = [], feedback = [], outputs = {}, onAgentClick }: PipelineViewProps) {
  const isActive = (id: string) => state[id] === 'running' || state[id] === 'completed';
  const scoreFor = (id: AgentId) => scores?.[id] ?? 0;
  const logCountFor = (id: AgentId) => logs.filter(l => l.agent === id).length;
  const tokensFor = (id: AgentId) => outputs[id]?.totalTokens;

  const latestRedispatch = feedback.filter(f => f.action === 'redispatch').at(-1);

  return (
    <div className="grid grid-cols-1 gap-0">
      <AgentCard agent={AGENTS[0]} status={state.planner} score={scoreFor('planner')} logCount={logCountFor('planner')} tokens={tokensFor('planner')} onClick={onAgentClick ? () => onAgentClick('planner') : undefined} />

      <ConnectionLine active={isActive('designer') || isActive('backend')} />

      <div className="grid grid-cols-2 gap-2.5">
        <AgentCard agent={AGENTS[1]} status={state.designer} score={scoreFor('designer')} logCount={logCountFor('designer')} tokens={tokensFor('designer')} onClick={onAgentClick ? () => onAgentClick('designer') : undefined} />
        <AgentCard agent={AGENTS[2]} status={state.backend} score={scoreFor('backend')} logCount={logCountFor('backend')} tokens={tokensFor('backend')} onClick={onAgentClick ? () => onAgentClick('backend') : undefined} />
      </div>

      <ConnectionLine active={isActive('reviewer')} />

      <AgentCard agent={AGENTS[3]} status={state.reviewer} score={scoreFor('reviewer')} logCount={logCountFor('reviewer')} tokens={tokensFor('reviewer')} onClick={onAgentClick ? () => onAgentClick('reviewer') : undefined} />

      {latestRedispatch && latestRedispatch.from === 'reviewer' && (
        <FeedbackArrow from={latestRedispatch.from} targets={latestRedispatch.target} />
      )}

      <ConnectionLine active={isActive('tester')} />

      <AgentCard agent={AGENTS[4]} status={state.tester} score={scoreFor('tester')} logCount={logCountFor('tester')} tokens={tokensFor('tester')} onClick={onAgentClick ? () => onAgentClick('tester') : undefined} />

      {latestRedispatch && latestRedispatch.from === 'tester' && (
        <FeedbackArrow from={latestRedispatch.from} targets={latestRedispatch.target} />
      )}
    </div>
  );
}
