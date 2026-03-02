import { useEffect, useRef, useState } from 'react';
import { X, Clock, MessageSquare, RefreshCw, AlertTriangle, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { AGENTS } from '../lib/config';
import { cn } from '../lib/utils';
import type { PipelineRun, AgentId } from '../lib/types';

interface RunDetailModalProps {
  run: PipelineRun;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m${rem > 0 ? ` ${rem}s` : ''}`;
}

const SEVERITY_ICON = { info: Info, warning: AlertTriangle, blocking: AlertTriangle };
const SEVERITY_COLOR = { info: 'text-blue-400', warning: 'text-amber-400', blocking: 'text-red-400' };
const SEVERITY_BG = { info: 'bg-blue-500/5', warning: 'bg-amber-500/5', blocking: 'bg-red-500/5' };

export default function RunDetailModal({ run, onClose }: RunDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [expandedAgents, setExpandedAgents] = useState<Set<AgentId>>(new Set());

  // Close on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', onClick), 0);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose]);

  const toggleAgent = (agentId: AgentId) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };

  const avgScore = (() => {
    const scores = Object.values(run.scores).filter(s => s > 0);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        ref={modalRef}
        className="mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-border px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
                  run.status === 'completed' ? 'bg-emerald-400' : 'bg-red-500',
                )}
              />
              <span className="truncate text-[15px] font-bold text-foreground">{run.request}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                run.status === 'completed'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400',
              )}>
                {run.status === 'completed' ? 'Termine' : 'Erreur'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(run.durationMs)}
              </span>
              <span>{run.startedAt} — {run.endedAt}</span>
              {run.iterations > 0 && (
                <span className="flex items-center gap-1 text-amber-500">
                  <RefreshCw className="h-3 w-3" />
                  {run.iterations} iteration{run.iterations > 1 ? 's' : ''}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {run.logCount} logs
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Scores grid */}
          <div className="border-b border-border px-6 py-4">
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Scores agents
            </div>
            <div className="grid grid-cols-5 gap-2">
              {AGENTS.map(a => {
                const s = run.scores[a.id];
                return (
                  <div key={a.id} className="rounded-lg border border-border bg-muted p-2.5 text-center">
                    <div className="mb-1 text-[11px] font-medium text-muted-foreground">{a.name}</div>
                    <div className={cn(
                      'text-lg font-bold',
                      s > 70 ? 'text-emerald-400'
                        : s >= 40 ? 'text-amber-400'
                          : s > 0 ? 'text-red-400'
                            : 'text-muted-foreground/40',
                    )}>
                      {s > 0 ? s : '\u2014'}
                    </div>
                  </div>
                );
              })}
            </div>
            {avgScore > 0 && (
              <div className="mt-2 text-right text-[11px] text-muted-foreground">
                Moyenne : <span className="font-semibold text-foreground">{avgScore}/100</span>
              </div>
            )}
          </div>

          {/* Agent outputs */}
          {run.outputs && Object.keys(run.outputs).length > 0 && (
            <div className="border-b border-border px-6 py-4">
              <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Outputs agents
              </div>
              <div className="space-y-1.5">
                {AGENTS.map(a => {
                  const output = run.outputs?.[a.id];
                  if (!output) return null;
                  const isExpanded = expandedAgents.has(a.id);
                  return (
                    <div key={a.id} className="rounded-lg border border-border">
                      <button
                        onClick={() => toggleAgent(a.id)}
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/50"
                      >
                        {isExpanded
                          ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        }
                        <span className="text-[12px] font-semibold" style={{ color: a.color }}>{a.name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {(output.durationMs / 1000).toFixed(1)}s
                        </span>
                      </button>
                      {isExpanded && (
                        <pre className="max-h-[300px] overflow-y-auto border-t border-border bg-card px-3 py-2 font-mono text-[11px] text-foreground/85 whitespace-pre-wrap">
                          {output.content}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Feedback */}
          {run.feedback && run.feedback.length > 0 && (
            <div className="border-b border-border px-6 py-4">
              <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Feedback ({run.feedback.length})
              </div>
              <div className="space-y-1.5">
                {run.feedback.map(fb => {
                  const SevIcon = SEVERITY_ICON[fb.severity];
                  return (
                    <div key={fb.id} className={cn('flex items-start gap-2 rounded-lg px-3 py-2 text-[11px]', SEVERITY_BG[fb.severity])}>
                      <SevIcon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', SEVERITY_COLOR[fb.severity])} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('font-semibold uppercase', SEVERITY_COLOR[fb.severity])}>{fb.severity}</span>
                          <span className="text-muted-foreground">{fb.from} → {fb.target.join(', ')}</span>
                          {fb.action === 'redispatch' && (
                            <span className="flex items-center gap-0.5 text-indigo-400">
                              <RefreshCw className="h-3 w-3" />
                              redispatch
                            </span>
                          )}
                          <span className="ml-auto text-muted-foreground/60">iter. {fb.iteration}</span>
                        </div>
                        <p className="mt-0.5 text-foreground/80">{fb.message}</p>
                      </div>
                      <span className="shrink-0 tabular-nums text-muted-foreground/60">{fb.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Logs */}
          {run.logs && run.logs.length > 0 && (
            <div className="px-6 py-4">
              <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Journal ({run.logs.length})
              </div>
              <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border bg-muted p-2.5">
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

          {/* Fallback */}
          {(!run.logs || run.logs.length === 0) && (!run.feedback || run.feedback.length === 0) && (!run.outputs || Object.keys(run.outputs).length === 0) && (
            <div className="px-6 py-8 text-center text-[12px] text-muted-foreground">
              Pas de donnees detaillees pour cette execution.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
