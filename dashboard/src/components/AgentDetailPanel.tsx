import { useEffect, useRef } from 'react';
import { X, MessageSquare, RotateCcw, AlertTriangle, Info, Clock, Zap } from 'lucide-react';
import { AGENTS, STATUS_CONFIG } from '../lib/config';
import { cn } from '../lib/utils';
import type { AgentId, AgentStatus, PipelineLog, FeedbackEntry, AgentOutput } from '../lib/types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AgentDetailPanelProps {
  agentId: AgentId;
  status: AgentStatus;
  score: number;
  logs: PipelineLog[];
  feedback: FeedbackEntry[];
  output?: AgentOutput;
  streamBuffer?: string;
  onClose: () => void;
}

const SEVERITY_STYLE = {
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  blocking: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
};

export default function AgentDetailPanel({ agentId, status, score, logs, feedback, output, streamBuffer, onClose }: AgentDetailPanelProps) {
  const agent = AGENTS.find(a => a.id === agentId);
  const cfg = STATUS_CONFIG[status];
  const panelRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  // Filter logs for this agent
  const agentLogs = logs.filter(l => l.agent === agentId);

  // Feedback involving this agent (sent by or targeting)
  const agentFeedback = feedback.filter(f => f.from === agentId || f.target.includes(agentId));

  const formatTokens = (t: number) => {
    if (t >= 1000) return `${(t / 1000).toFixed(1)}k`;
    return String(t);
  };

  const hasTokenStats = output && (output.inputTokens || output.outputTokens || output.totalTokens);
  const ratio = output?.inputTokens && output?.outputTokens
    ? (output.outputTokens / output.inputTokens).toFixed(2)
    : null;

  // Auto-scroll stream output
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [streamBuffer]);

  // Close on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', onClick), 0);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose]);

  if (!agent) return null;

  const Icon = agent.icon;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        ref={panelRef}
        className="w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in srgb, ${agent.color} 12%, transparent)` }}
          >
            <Icon className="h-5 w-5" style={{ color: agent.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-foreground">{agent.name}</span>
              <span
                className={cn('inline-block h-2 w-2 rounded-full', cfg.dotClass, cfg.pulse && 'animate-pulse-dot')}
              />
              <span className="text-[11px] font-semibold uppercase" style={{ color: cfg.labelColor }}>
                {cfg.label}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">{agent.role}</div>
          </div>
          {score > 0 && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-bold',
                score > 70 ? 'bg-emerald-500/15 text-emerald-500'
                  : score >= 40 ? 'bg-amber-500/15 text-amber-500'
                    : 'bg-red-500/15 text-red-500',
              )}
            >
              {score}
            </span>
          )}
          <button
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-3 border-b border-border px-5 py-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="tabular-nums font-medium">{agentLogs.length}</span> messages
          </div>
          {agentFeedback.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-500">
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="tabular-nums font-medium">{agentFeedback.length}</span> feedback
            </div>
          )}
          {output?.durationMs !== undefined && (
            <div className="flex items-center gap-1.5 text-xs text-blue-400">
              <Clock className="h-3.5 w-3.5" />
              <span className="tabular-nums font-medium">{(output.durationMs / 1000).toFixed(1)}s</span>
            </div>
          )}
          {hasTokenStats && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <Zap className="h-3.5 w-3.5" />
              <span className="tabular-nums font-medium">
                {output.totalTokens ? formatTokens(output.totalTokens) :
                  `${formatTokens(output.inputTokens || 0)} + ${formatTokens(output.outputTokens || 0)}`} tok
              </span>
            </div>
          )}
        </div>

        {/* Detailed Stats Section (tokens) */}
        {hasTokenStats && (
          <div className="border-b border-border px-5 py-3.5">
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Statistiques de consommation
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {output.inputTokens !== undefined && (
                <div className="rounded-lg border border-border bg-muted px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Input</div>
                  <div className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
                    {formatTokens(output.inputTokens)}
                  </div>
                </div>
              )}
              {output.outputTokens !== undefined && (
                <div className="rounded-lg border border-border bg-muted px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Output</div>
                  <div className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
                    {formatTokens(output.outputTokens)}
                  </div>
                </div>
              )}
              {output.totalTokens !== undefined && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-amber-500/80">Total</div>
                  <div className="mt-0.5 text-sm font-bold tabular-nums text-amber-500">
                    {formatTokens(output.totalTokens)}
                  </div>
                </div>
              )}
              {ratio && (
                <div className="rounded-lg border border-border bg-muted px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Ratio out/in</div>
                  <div className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
                    {ratio}×
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Stream output section */}
          {streamBuffer && streamBuffer.length > 0 && (
            <div className="border-b border-border px-5 py-4">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Output agent {status === 'running' && <span className="ml-1 animate-pulse text-amber-400">(streaming...)</span>}
              </div>
              <div
                ref={streamRef}
                className="max-h-[300px] overflow-y-auto rounded-lg border border-border bg-muted p-3"
              >
                <MarkdownRenderer className="text-[11px]">{streamBuffer}</MarkdownRenderer>
              </div>
            </div>
          )}

          {/* Feedback section */}
          {agentFeedback.length > 0 && (
            <div className="border-b border-border px-5 py-4">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Feedback
              </div>
              <div className="space-y-2">
                {agentFeedback.map(fb => {
                  const sev = SEVERITY_STYLE[fb.severity];
                  const SevIcon = sev.icon;
                  const isSender = fb.from === agentId;
                  return (
                    <div key={fb.id} className={cn('rounded-lg border px-3 py-2.5', sev.bg, sev.border)}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <SevIcon className={cn('h-3.5 w-3.5', sev.color)} />
                        <span className={cn('text-[11px] font-semibold uppercase', sev.color)}>
                          {fb.severity}
                        </span>
                        {fb.action === 'redispatch' && (
                          <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-indigo-400">
                            <RotateCcw className="h-3 w-3" />
                            Redispatch
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/85">{fb.message}</p>
                      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{fb.time}</span>
                        <span>{isSender ? `→ ${fb.target.join(', ')}` : `← ${fb.from}`}</span>
                        <span>iter. {fb.iteration}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Logs section */}
          <div className="px-5 py-4">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Journal ({agentLogs.length})
            </div>
            {agentLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun message pour cet agent.</p>
            ) : (
              <div className="space-y-0">
                {agentLogs.map((log, i) => {
                  const isFeedback = log.msg.startsWith('[FEEDBACK');
                  const isRedispatch = log.msg.startsWith('[REDISPATCH]');
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex items-start gap-2 py-1.5 font-mono text-[12px]',
                        isFeedback && 'border-l-2 border-amber-500/50 pl-2 -ml-2',
                        isRedispatch && 'border-l-2 border-indigo-500/50 pl-2 -ml-2',
                      )}
                    >
                      <span className="shrink-0 text-muted-foreground tabular-nums">{log.time}</span>
                      <span className="text-foreground/85">{log.msg}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
