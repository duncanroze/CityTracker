import { memo, Fragment } from 'react';
import { Footprints } from 'lucide-react';
import type { LabeledRoute } from '@/types';
import type { DisruptionsMap } from '@/hooks/useDisruptions';
import { cn } from '@/lib/utils';

interface RouteOptionBubblesProps {
  labeledRoute: LabeledRoute;
  selected: boolean;
  onClick: () => void;
  disruptions?: DisruptionsMap;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

/** Strip transport prefix: M1->1, RER-A->A, TER-H->H, keep T1/T2/T3A as-is */
function shortCode(code: string, transportType: string): string {
  if (transportType === 'METRO') return code.replace(/^M/, '');
  if (transportType === 'RER') return code.replace(/^RER-/, '');
  if (transportType === 'TRANSILIEN') return code.replace(/^TER-/, '');
  return code;
}

function LineCircle({
  code,
  color,
  textColor = '#FFFFFF',
  transportType,
  disruption,
}: {
  code: string;
  color: string;
  textColor?: string;
  transportType: string;
  disruption?: 'disrupted' | 'interrupted' | null;
}) {
  const isRectangular = transportType === 'RER' || transportType === 'TRANSILIEN';
  const display = shortCode(code, transportType);

  return (
    <span className="relative inline-flex">
      <span
        className={cn(
          'inline-flex items-center justify-center font-bold leading-none shrink-0 shadow-sm',
          isRectangular ? 'w-9 h-7 rounded-md text-[12px]' : 'w-8 h-8 rounded-full text-[13px]'
        )}
        style={{
          backgroundColor: color,
          color: textColor,
          outline: disruption
            ? `2px solid var(--disruption-${disruption === 'interrupted' ? 'interrupted' : 'warning'})`
            : undefined,
          outlineOffset: disruption ? '1px' : undefined,
        }}
      >
        {display}
      </span>
      {disruption && (
        <span
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
          style={{
            backgroundColor: `var(--disruption-${disruption === 'interrupted' ? 'interrupted' : 'warning'})`,
          }}
        />
      )}
    </span>
  );
}

function TransferConnector() {
  return (
    <div className="flex items-center mx-1">
      <div className="w-2.5 h-0.5 bg-border rounded-full" />
      <Footprints className="w-3 h-3 text-muted-foreground mx-0.5" />
      <div className="w-2.5 h-0.5 bg-border rounded-full" />
    </div>
  );
}

export default memo(function RouteOptionBubbles({
  labeledRoute,
  selected,
  onClick,
  disruptions,
}: RouteOptionBubblesProps) {
  const { label, route } = labeledRoute;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border bg-card text-card-foreground transition-all focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
        selected
          ? 'ring-2 ring-primary/20 border-primary/40'
          : 'border-border hover:border-primary/20'
      )}
    >
      {/* Header: label + duration */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            'text-[11px] font-semibold px-2 py-0.5 rounded-full',
            label === 'Fastest'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {label === 'Fastest' ? 'Le plus rapide' : `Option ${label.replace('Option ', '')}`}
        </span>
        <span className="text-sm font-semibold">
          {formatDuration(route.totalDurationSeconds)}
        </span>
      </div>

      {/* Circle chain */}
      <div className="flex items-center justify-center">
        {route.walkingFrom && (
          <>
            <Footprints className="w-4 h-4 text-muted-foreground" />
            <div className="w-2 h-0.5 bg-border rounded-full mx-0.5" />
          </>
        )}
        {route.segments.map((seg, i) => (
          <Fragment key={`${seg.lineCode}-${i}`}>
            {i > 0 && <TransferConnector />}
            <LineCircle
              code={seg.lineCode}
              color={seg.lineColor}
              textColor={seg.lineTextColor}
              transportType={seg.transportType}
              disruption={disruptions?.[seg.lineCode]?.severity}
            />
          </Fragment>
        ))}
        {route.walkingTo && (
          <>
            <div className="w-2 h-0.5 bg-border rounded-full mx-0.5" />
            <Footprints className="w-4 h-4 text-muted-foreground" />
          </>
        )}
      </div>

      {/* Info row: station counts + transfers */}
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-3">
          {route.segments.map((seg, i) => (
            <span key={`count-${i}`} className="text-[11px] text-muted-foreground">
              {seg.stops.length} arr.
            </span>
          ))}
        </div>
        {route.totalTransfers > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {route.totalTransfers} corresp.
          </span>
        )}
      </div>
    </button>
  );
});
