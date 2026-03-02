import { cn } from '../lib/utils';
import { AGENTS } from '../lib/config';
import { History, Clock, MessageSquare, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import RunDetailModal from './RunDetailModal';
import type { PipelineRun } from '../lib/types';

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m${rem > 0 ? ` ${rem}s` : ''}`;
}

function ScoreDot({ score }: { score: number }) {
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full',
        score > 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : score > 0 ? 'bg-red-500' : 'bg-muted-foreground/30',
      )}
    />
  );
}

interface RunHistoryProps {
  runs: PipelineRun[];
}

export default function RunHistory({ runs }: RunHistoryProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PipelineRun | null>(null);

  if (runs.length === 0) return null;

  // Reverse order: most recent first
  const reversed = [...runs].reverse();
  const displayRuns = showAll ? reversed : reversed.slice(0, 3);

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <History className="h-3.5 w-3.5" />
          Historique pipeline
          <span className="ml-auto text-[10px] font-normal tabular-nums">{runs.length} run{runs.length > 1 ? 's' : ''}</span>
        </div>
        <div className="space-y-2">
          {displayRuns.map((run) => {
            const avgScore = Object.values(run.scores).filter(s => s > 0);
            const avg = avgScore.length > 0 ? Math.round(avgScore.reduce((a, b) => a + b, 0) / avgScore.length) : 0;

            return (
              <div
                key={run.id}
                onClick={() => setSelectedRun(run)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-[12px] cursor-pointer transition-colors',
                  run.status === 'completed'
                    ? 'border-emerald-500/20 bg-emerald-950/10 hover:border-emerald-500/40'
                    : 'border-red-500/20 bg-red-950/10 hover:border-red-500/40',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-2 w-2 shrink-0 rounded-full',
                    run.status === 'completed' ? 'bg-emerald-400' : 'bg-red-500',
                  )}
                />
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {run.request}
                </span>
                <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
                  <div className="flex items-center gap-0.5" title={AGENTS.map(a => `${a.name}: ${run.scores[a.id]}`).join(', ')}>
                    {AGENTS.map(a => (
                      <ScoreDot key={a.id} score={run.scores[a.id]} />
                    ))}
                    {avg > 0 && <span className="ml-1 text-[10px] tabular-nums">{avg}</span>}
                  </div>
                  {run.iterations > 0 && (
                    <div className="flex items-center gap-0.5 text-amber-500">
                      <RefreshCw className="h-3 w-3" />
                      <span className="tabular-nums text-[10px]">{run.iterations}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-0.5">
                    <MessageSquare className="h-3 w-3" />
                    <span className="tabular-nums">{run.logCount}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    <span className="tabular-nums">{formatDuration(run.durationMs)}</span>
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground/60">{run.startedAt}</span>
                </div>
              </div>
            );
          })}
        </div>
        {runs.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAll ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showAll ? 'Reduire' : `Voir tout (${runs.length})`}
          </button>
        )}
      </div>

      {/* Run Detail Modal */}
      {selectedRun && (
        <RunDetailModal
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
        />
      )}
    </>
  );
}
