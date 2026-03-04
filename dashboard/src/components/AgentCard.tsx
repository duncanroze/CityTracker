import { cn } from '../lib/utils';
import { STATUS_CONFIG } from '../lib/config';
import type { AgentConfig, AgentStatus } from '../lib/types';

interface AgentCardProps {
  agent: AgentConfig;
  status: AgentStatus;
  score?: number;
  logCount?: number;
  tokens?: number;
  onClick?: () => void;
}

export default function AgentCard({ agent, status, score = 0, logCount, tokens, onClick }: AgentCardProps) {
  const cfg = STATUS_CONFIG[status];
  const Icon = agent.icon;

  const formatTokens = (t: number) => {
    if (t >= 1000) return `${(t / 1000).toFixed(1)}k`;
    return String(t);
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl border-[1.5px] px-4 py-3.5 transition-all duration-400',
        'flex items-center gap-3.5',
        cfg.bgClass,
        cfg.borderClass,
        onClick && 'cursor-pointer hover:border-foreground/20',
      )}
    >
      {status === 'running' && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5 animate-scanline"
          style={{ background: `linear-gradient(90deg, transparent, ${agent.color}, transparent)` }}
        />
      )}

      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `color-mix(in srgb, ${agent.color} 10%, transparent)` }}
      >
        <Icon className="h-6 w-6" style={{ color: agent.color }} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <span className="text-[15px] font-bold text-foreground">{agent.name}</span>
          <span
            className={cn(
              'inline-block h-2.5 w-2.5 rounded-full',
              cfg.dotClass,
              cfg.pulse && 'animate-pulse-dot',
            )}
            style={cfg.pulse ? { boxShadow: `0 0 8px color-mix(in srgb, ${agent.color} 50%, transparent)` } : undefined}
          />
        </div>
        <div className="text-xs text-muted-foreground">{agent.role}</div>
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: cfg.labelColor }}
          >
            {cfg.label}
          </span>
          {score > 0 && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                score > 70
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : score >= 40
                    ? 'bg-amber-500/15 text-amber-500'
                    : 'bg-red-500/15 text-red-500',
              )}
            >
              {score}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {tokens !== undefined && tokens > 0 && (
              <span className="text-[10px] tabular-nums text-amber-400">
                {formatTokens(tokens)} tok
              </span>
            )}
            {logCount !== undefined && logCount > 0 && (
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {logCount} msg
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
