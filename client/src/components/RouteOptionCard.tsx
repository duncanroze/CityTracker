import { memo } from 'react';
import type { LabeledRoute } from '../types';
import type { DisruptionsMap } from '../hooks/useDisruptions';
import LineBadge from './LineBadge';
import { cn } from '@/lib/utils';

interface RouteOptionCardProps {
  labeledRoute: LabeledRoute;
  selected: boolean;
  onClick: () => void;
  disruptions?: DisruptionsMap;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

export default memo(function RouteOptionCard({ labeledRoute, selected, onClick, disruptions }: RouteOptionCardProps) {
  const { label, route } = labeledRoute;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border bg-card text-card-foreground transition-all',
        selected
          ? 'ring-2 ring-primary/20 border-primary/40'
          : 'border-border hover:border-primary/20'
      )}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className={cn(
          'text-[11px] font-semibold px-2 py-0.5 rounded-full',
          label === 'Fastest'
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : 'bg-muted text-muted-foreground'
        )}>
          {label === 'Fastest' ? 'Le plus rapide' : `Option ${label.replace('Option ', '')}`}
        </span>
        <span className="text-sm font-semibold">
          {formatDuration(route.totalDurationSeconds)}
        </span>
      </div>

      {/* Proportional segment bar */}
      <div className="flex items-stretch h-6 rounded-md overflow-hidden mb-2">
        {route.segments.map((seg, i) => (
          <div
            key={`${seg.lineCode}-${i}`}
            className="flex items-center justify-center min-w-[28px] overflow-hidden"
            style={{
              flex: seg.durationSeconds,
              backgroundColor: seg.lineColor,
            }}
          >
            <span
              className="text-[10px] font-bold leading-none px-1 truncate"
              style={{ color: seg.lineTextColor || '#fff' }}
            >
              {seg.lineCode}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom: line badges + transfer count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {route.segments.map((seg, i) => (
            <LineBadge
              key={`${seg.lineCode}-${i}`}
              code={seg.lineCode}
              color={seg.lineColor}
              textColor={seg.lineTextColor}
              disruption={disruptions?.[seg.lineCode]?.severity}
              size="sm"
            />
          ))}
        </div>
        {route.totalTransfers > 0 && (
          <span className="text-xs text-muted-foreground">
            {route.totalTransfers} corresp.
          </span>
        )}
      </div>
    </button>
  );
});
