'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, ChevronDown, Timer } from 'lucide-react';
import type { RouteSegment as RouteSegmentType } from '@/types';
import type { LineDisruption } from '@/hooks/useDisruptions';
import LineBadge from './LineBadge';
import { cn } from '@/lib/utils';

function DepartureCountdown({ departure }: { departure: string }) {
  const [remainingSec, setRemainingSec] = useState(() => {
    const diff = Math.floor((new Date(departure).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    const id = setInterval(() => {
      const diff = Math.floor((new Date(departure).getTime() - Date.now()) / 1000);
      setRemainingSec(Math.max(0, diff));
    }, 1000);
    return () => clearInterval(id);
  }, [departure]);

  const mins = Math.floor(remainingSec / 60);
  const isImminent = remainingSec < 60;
  const isPassed = remainingSec <= 0;

  if (isPassed) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium mb-1',
        isImminent
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 animate-pulse'
          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      )}
    >
      <Timer className="w-3.5 h-3.5 shrink-0" />
      {isImminent
        ? 'Départ imminent'
        : `Prochain départ dans ${mins} min`}
    </div>
  );
}

interface RouteSegmentProps {
  segment: RouteSegmentType;
  disruption?: LineDisruption;
}

export default function RouteSegment({ segment, disruption }: RouteSegmentProps) {
  const [expanded, setExpanded] = useState(false);
  const { stops } = segment;
  const collapsible = stops.length > 4;
  const middleStops = stops.slice(1, -1);
  const showMiddle = !collapsible || expanded;

  return (
    <div className="relative pl-6">
      {/* Colored left border */}
      <div
        className="absolute left-[7px] top-0 bottom-0 w-1 rounded-full"
        style={{ backgroundColor: segment.lineColor }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 pb-1">
        <LineBadge code={segment.lineCode} color={segment.lineColor} textColor={segment.lineTextColor} disruption={disruption?.severity} />
        <span className="text-sm text-muted-foreground">{segment.lineName}</span>
        <span className="text-xs text-muted-foreground ml-auto">{Math.round(segment.durationSeconds / 60)} min</span>
      </div>

      {/* Direction */}
      {segment.direction && (
        <div className="flex items-center gap-1.5 pb-2 text-xs text-muted-foreground">
          <span>Direction</span>
          <span className="font-medium text-foreground">{segment.direction}</span>
        </div>
      )}

      {/* Disruption alert */}
      {disruption && (
        <div className={cn(
          'flex items-center gap-1.5 pb-2 text-xs rounded-md px-2 py-1.5 mb-1',
          disruption.severity === 'interrupted'
            ? 'bg-destructive/10 text-destructive'
            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        )}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="font-medium">
            {disruption.severity === 'interrupted' ? 'Trafic interrompu' : 'Trafic perturbé'}
          </span>
          {disruption.message && (
            <span className="text-muted-foreground truncate">— {disruption.message}</span>
          )}
        </div>
      )}

      {/* Real-time departure countdown */}
      {segment.nextDepartures && segment.nextDepartures.length > 0 && (
        <DepartureCountdown departure={segment.nextDepartures[0]} />
      )}

      {/* Stops */}
      <div className="space-y-0">
        {/* First stop */}
        <StopDot name={stops[0].stationName} color={segment.lineColor} filled />

        {/* Middle stops */}
        {showMiddle ? (
          middleStops.map((stop, i) => (
            <StopDot key={i} name={stop.stationName} color={segment.lineColor} filled={false} />
          ))
        ) : (
          <button
            onClick={() => setExpanded(true)}
            aria-label={`Afficher ${middleStops.length} arrêts intermédiaires`}
            aria-expanded={expanded}
            className="flex items-center gap-2 py-1.5 pl-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          >
            <span
              className="w-2 h-2 rounded-full border-2 shrink-0"
              style={{ borderColor: segment.lineColor }}
            />
            <span>{middleStops.length} arrêts</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        )}

        {/* Last stop */}
        {stops.length > 1 && (
          <StopDot name={stops[stops.length - 1].stationName} color={segment.lineColor} filled />
        )}
      </div>
    </div>
  );
}

function StopDot({ name, color, filled }: { name: string; color: string; filled: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1.5 pl-1">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={
          filled
            ? { backgroundColor: color }
            : { border: '2px solid', borderColor: color }
        }
      />
      <span className={cn('text-sm', filled ? 'font-medium' : 'text-muted-foreground')}>{name}</span>
    </div>
  );
}
