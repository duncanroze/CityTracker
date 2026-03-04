'use client';

import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DepartureChipsProps {
  departures: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** ETA at station in ms — used to dim unreachable departures */
  etaMs?: number;
}

function useCountdown(isoTimestamp: string): number {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(isoTimestamp).getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, Math.floor((new Date(isoTimestamp).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [isoTimestamp]);

  return remaining;
}

type ChipReachability = 'reachable' | 'tight' | 'unreachable';

function DepartureChip({
  departure,
  isSelected,
  onClick,
  reachability,
}: {
  departure: string;
  isSelected: boolean;
  onClick: () => void;
  reachability: ChipReachability;
}) {
  const remaining = useCountdown(departure);

  if (remaining <= 0) return null;

  const mins = Math.floor(remaining / 60);
  const isImminent = remaining < 60;
  const depTime = new Date(departure);
  const timeStr = `${depTime.getHours()}h${String(depTime.getMinutes()).padStart(2, '0')}`;
  const label = isImminent ? `imm. · ${timeStr}` : `${mins} min · ${timeStr}`;

  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md px-2.5 py-1.5 text-xs font-medium transition-all border cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1',
        // Unreachable: dimmed + line-through, but still clickable
        reachability === 'unreachable' && !isSelected && 'opacity-50 line-through',
        reachability === 'unreachable' && isSelected
          && 'opacity-70 line-through bg-muted/50 text-muted-foreground border-foreground/30 ring-1 ring-foreground/20',
        // Tight + selected: amber warning style
        reachability === 'tight' && isSelected
          && 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 ring-1 ring-amber-500/30',
        // Tight + not selected
        reachability === 'tight' && !isSelected
          && 'bg-muted/50 text-muted-foreground border-border hover:border-amber-500/30 hover:bg-amber-500/10',
        // Reachable + selected
        reachability === 'reachable' && isSelected
          && 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/30',
        // Reachable + not selected
        reachability === 'reachable' && !isSelected
          && 'bg-muted/50 text-muted-foreground border-border hover:border-emerald-500/30 hover:bg-emerald-500/10',
        isImminent && isSelected && reachability !== 'unreachable' && 'animate-pulse',
      )}
      aria-pressed={isSelected}
    >
      {label}
    </button>
  );
}

/**
 * Compute reachability for a departure given an ETA at the station.
 * - unreachable: departure is before ETA
 * - tight: departure is 0-2 min after ETA
 * - reachable: departure is 2+ min after ETA
 */
function getReachability(departureIso: string, etaMs?: number): ChipReachability {
  if (etaMs === undefined) return 'reachable';
  const depMs = new Date(departureIso).getTime();
  const margin = depMs - etaMs;
  if (margin < 0) return 'unreachable';
  if (margin < 120_000) return 'tight'; // < 2 min
  return 'reachable';
}

export default function DepartureChips({ departures, selectedIndex, onSelect, etaMs }: DepartureChipsProps) {
  if (departures.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Timer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      {departures.map((dep, i) => (
        <DepartureChip
          key={dep}
          departure={dep}
          isSelected={i === selectedIndex}
          onClick={() => onSelect(i)}
          reachability={getReachability(dep, etaMs)}
        />
      ))}
    </div>
  );
}
