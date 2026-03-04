import { Footprints, Bike } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DirectEstimate } from '@/types';

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins === 0) return '< 1 min';
  return `${mins} min`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

interface AlternativeModesProps {
  walking: DirectEstimate | null;
  cycling: DirectEstimate | null;
  activeMode?: 'walking' | 'cycling' | null;
  onClickWalking?: () => void;
  onClickCycling?: () => void;
}

export default function AlternativeModes({ walking, cycling, activeMode, onClickWalking, onClickCycling }: AlternativeModesProps) {
  if (!walking && !cycling) return null;

  return (
    <div className="flex gap-2">
      {walking && (
        <button
          onClick={onClickWalking}
          className={cn(
            'flex-1 flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors text-left',
            activeMode === 'walking'
              ? 'border-foreground/30 bg-foreground/5 ring-1 ring-foreground/10'
              : 'border-border bg-card hover:border-foreground/20',
          )}
        >
          <Footprints className={cn('w-4 h-4 shrink-0', activeMode === 'walking' ? 'text-foreground' : 'text-muted-foreground')} />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">{formatDuration(walking.durationSeconds)}</p>
            <p className="text-[11px] text-muted-foreground">{formatDistance(walking.distanceMeters)}</p>
          </div>
        </button>
      )}
      {cycling && (
        <button
          onClick={onClickCycling}
          className={cn(
            'flex-1 flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors text-left',
            activeMode === 'cycling'
              ? 'border-foreground/30 bg-foreground/5 ring-1 ring-foreground/10'
              : 'border-border bg-card hover:border-foreground/20',
          )}
        >
          <Bike className={cn('w-4 h-4 shrink-0', activeMode === 'cycling' ? 'text-foreground' : 'text-muted-foreground')} />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">{formatDuration(cycling.durationSeconds)}</p>
            <p className="text-[11px] text-muted-foreground">{formatDistance(cycling.distanceMeters)}</p>
          </div>
        </button>
      )}
    </div>
  );
}
