import { cn } from '../lib/utils';
import { AGENTS } from '../lib/config';
import { CheckCircle, AlertCircle, Clock, MessageSquare, Trophy, RefreshCw, Zap } from 'lucide-react';
import type { AgentId, AgentOutput } from '../lib/types';

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m${rem > 0 ? ` ${rem}s` : ''}`;
}

interface SummaryBannerProps {
  status: 'completed' | 'error';
  durationMs: number;
  scores: Record<AgentId, number>;
  logCount: number;
  iterations?: number;
  feedbackCount?: number;
  outputs?: Partial<Record<AgentId, AgentOutput>>;
}

export default function SummaryBanner({ status, durationMs, scores, logCount, iterations = 0, feedbackCount = 0, outputs = {} }: SummaryBannerProps) {
  const isOk = status === 'completed';
  const activeScores = Object.values(scores).filter(s => s > 0);
  const avg = activeScores.length > 0 ? Math.round(activeScores.reduce((a, b) => a + b, 0) / activeScores.length) : 0;

  const totalTokens = Object.values(outputs).reduce((sum, o) => sum + (o?.totalTokens || 0), 0);
  const formatTokens = (t: number) => {
    if (t >= 1000) return `${(t / 1000).toFixed(1)}k`;
    return String(t);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl border-[1.5px] px-5 py-3.5 transition-all duration-500 animate-in fade-in slide-in-from-top-2',
        isOk
          ? 'border-emerald-400/40 bg-emerald-950/20'
          : 'border-red-500/40 bg-red-950/20',
      )}
    >
      {isOk
        ? <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
        : <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
      }
      <span className={cn('text-sm font-semibold', isOk ? 'text-emerald-300' : 'text-red-400')}>
        Pipeline {isOk ? 'termine avec succes' : 'termine avec erreurs'}
      </span>

      <div className="ml-auto flex items-center gap-4 text-[12px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span className="tabular-nums">{formatDuration(durationMs)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="tabular-nums">{logCount}</span>
        </div>
        {totalTokens > 0 && (
          <div className="flex items-center gap-1.5 text-amber-400">
            <Zap className="h-3.5 w-3.5" />
            <span className="tabular-nums">{formatTokens(totalTokens)} tok</span>
          </div>
        )}
        {iterations > 0 && (
          <div className="flex items-center gap-1.5 text-amber-500">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="tabular-nums">{iterations} iter. ({feedbackCount} fb)</span>
          </div>
        )}
        {avg > 0 && (
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" />
            <span
              className={cn(
                'tabular-nums font-semibold',
                avg > 70 ? 'text-emerald-500' : avg >= 40 ? 'text-amber-500' : 'text-red-500',
              )}
            >
              {avg}
            </span>
          </div>
        )}
        {/* Individual scores */}
        <div className="flex items-center gap-1">
          {AGENTS.map(a => {
            const s = scores[a.id];
            if (s === 0) return null;
            return (
              <span
                key={a.id}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-bold leading-none',
                  s > 70 ? 'bg-emerald-500/15 text-emerald-500'
                    : s >= 40 ? 'bg-amber-500/15 text-amber-500'
                      : 'bg-red-500/15 text-red-500',
                )}
                title={a.name}
              >
                {a.name[0]}{s}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
