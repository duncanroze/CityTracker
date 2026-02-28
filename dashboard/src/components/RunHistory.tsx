import { cn } from '../lib/utils';
import { AGENTS } from '../lib/config';
import { History, Clock, MessageSquare, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import { useState } from 'react';
import type { PipelineRun, FeedbackEntry } from '../lib/types';

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

const SEVERITY_ICON = { info: Info, warning: AlertTriangle, blocking: AlertTriangle };
const SEVERITY_COLOR = { info: 'text-blue-400', warning: 'text-amber-400', blocking: 'text-red-400' };

function FeedbackItem({ fb }: { fb: FeedbackEntry }) {
  const SevIcon = SEVERITY_ICON[fb.severity];
  return (
    <div className={cn(
      'flex items-start gap-2 rounded px-2.5 py-1.5 text-[11px]',
      fb.severity === 'blocking' ? 'bg-red-500/5' : fb.severity === 'warning' ? 'bg-amber-500/5' : 'bg-blue-500/5',
    )}>
      <SevIcon className={cn('h-3 w-3 mt-0.5 shrink-0', SEVERITY_COLOR[fb.severity])} />
      <div className="min-w-0 flex-1">
        <span className={cn('font-semibold uppercase', SEVERITY_COLOR[fb.severity])}>{fb.severity}</span>
        <span className="text-muted-foreground"> — {fb.from} → {fb.target.join(', ')}</span>
        {fb.action === 'redispatch' && (
          <span className="ml-1 text-indigo-400">[redispatch]</span>
        )}
        <p className="mt-0.5 text-foreground/80">{fb.message}</p>
      </div>
      <span className="shrink-0 tabular-nums text-muted-foreground/60">{fb.time}</span>
    </div>
  );
}

interface RunHistoryProps {
  runs: PipelineRun[];
}

export default function RunHistory({ runs }: RunHistoryProps) {
  const [showAll, setShowAll] = useState(false);
  const [openRunId, setOpenRunId] = useState<number | null>(null);

  if (runs.length === 0) return null;

  const displayRuns = showAll ? runs : runs.slice(-3);

  return (
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
          const isOpen = openRunId === run.id;

          return (
            <div key={run.id}>
              <div
                onClick={() => setOpenRunId(isOpen ? null : run.id)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-[12px] cursor-pointer transition-colors',
                  run.status === 'completed'
                    ? 'border-emerald-500/20 bg-emerald-950/10 hover:border-emerald-500/40'
                    : 'border-red-500/20 bg-red-950/10 hover:border-red-500/40',
                  isOpen && 'rounded-b-none',
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
                  {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className={cn(
                  'rounded-b-lg border border-t-0 px-4 py-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150',
                  run.status === 'completed'
                    ? 'border-emerald-500/20 bg-emerald-950/5'
                    : 'border-red-500/20 bg-red-950/5',
                )}>
                  {/* Scores breakdown */}
                  <div>
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scores</div>
                    <div className="flex flex-wrap gap-2">
                      {AGENTS.map(a => {
                        const s = run.scores[a.id];
                        return (
                          <div key={a.id} className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-muted-foreground">{a.name}</span>
                            <span className={cn(
                              'rounded px-1.5 py-0.5 font-bold leading-none',
                              s > 70 ? 'bg-emerald-500/15 text-emerald-500'
                                : s >= 40 ? 'bg-amber-500/15 text-amber-500'
                                  : s > 0 ? 'bg-red-500/15 text-red-500'
                                    : 'bg-muted text-muted-foreground',
                            )}>
                              {s || '\u2014'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="flex gap-4 text-[11px] text-muted-foreground">
                    <span>Debut : {run.startedAt}</span>
                    <span>Fin : {run.endedAt}</span>
                    <span>Duree : {formatDuration(run.durationMs)}</span>
                    {run.iterations > 0 && <span className="text-amber-500">{run.iterations} iteration(s)</span>}
                  </div>

                  {/* Feedback */}
                  {run.feedback && run.feedback.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Feedback ({run.feedback.length})
                      </div>
                      <div className="space-y-1">
                        {run.feedback.map(fb => (
                          <FeedbackItem key={fb.id} fb={fb} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Logs */}
                  {run.logs && run.logs.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Journal ({run.logs.length})
                      </div>
                      <div className="max-h-[200px] overflow-y-auto rounded border border-border bg-card p-2">
                        {run.logs.map((log, i) => {
                          const agent = AGENTS.find(a => a.id === log.agent);
                          const isFb = log.msg.startsWith('[FEEDBACK');
                          const isRd = log.msg.startsWith('[REDISPATCH]');
                          return (
                            <div
                              key={i}
                              className={cn(
                                'flex items-start gap-2 py-1 font-mono text-[11px]',
                                isFb && 'border-l-2 border-amber-500/50 pl-1.5 -ml-1',
                                isRd && 'border-l-2 border-indigo-500/50 pl-1.5 -ml-1',
                              )}
                            >
                              <span className="shrink-0 text-muted-foreground tabular-nums">{log.time}</span>
                              <span className="w-[60px] shrink-0 font-semibold" style={{ color: agent?.color }}>
                                [{agent?.name ?? log.agent}]
                              </span>
                              <span className="text-foreground/80">{log.msg}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Fallback for old runs without stored logs */}
                  {(!run.logs || run.logs.length === 0) && (!run.feedback || run.feedback.length === 0) && (
                    <p className="text-[11px] text-muted-foreground">
                      Pas de donnees detaillees pour cette execution (run anterieur a la mise a jour).
                    </p>
                  )}
                </div>
              )}
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
  );
}
