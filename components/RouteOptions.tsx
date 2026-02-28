'use client';

import { useState, useMemo } from 'react';
import { Clock, ArrowLeftRight, Footprints } from 'lucide-react';
import type { LabeledRoute } from '@/types';
import type { DisruptionsMap } from '@/hooks/useDisruptions';
import RouteOptionBubbles from './RouteOptionBubbles';
import { cn } from '@/lib/utils';

type SortKey = 'fastest' | 'transfers' | 'walking';

const SORT_OPTIONS: { key: SortKey; label: string; icon: typeof Clock }[] = [
  { key: 'fastest', label: 'Rapide', icon: Clock },
  { key: 'transfers', label: 'Corresp.', icon: ArrowLeftRight },
  { key: 'walking', label: 'Marche', icon: Footprints },
];

function getWalkingTime(lr: LabeledRoute): number {
  return (lr.route.walkingFrom?.durationSeconds ?? 0) + (lr.route.walkingTo?.durationSeconds ?? 0);
}

interface RouteOptionsProps {
  routes: LabeledRoute[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  disruptions?: DisruptionsMap;
}

export default function RouteOptions({ routes, selectedIndex, onSelect, disruptions }: RouteOptionsProps) {
  const [sortKey, setSortKey] = useState<SortKey>('fastest');

  const sortedIndices = useMemo(() => {
    const indices = routes.map((_, i) => i);
    if (sortKey === 'fastest') {
      indices.sort((a, b) => routes[a].route.totalDurationSeconds - routes[b].route.totalDurationSeconds);
    } else if (sortKey === 'transfers') {
      indices.sort((a, b) => routes[a].route.totalTransfers - routes[b].route.totalTransfers || routes[a].route.totalDurationSeconds - routes[b].route.totalDurationSeconds);
    } else if (sortKey === 'walking') {
      indices.sort((a, b) => getWalkingTime(routes[a]) - getWalkingTime(routes[b]) || routes[a].route.totalDurationSeconds - routes[b].route.totalDurationSeconds);
    }
    return indices;
  }, [routes, sortKey]);

  if (routes.length <= 1) return null;

  return (
    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Itinéraires</h2>
        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => setSortKey(opt.key)}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
                  sortKey === opt.key
                    ? 'bg-foreground/10 text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="w-3 h-3" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-2">
        {sortedIndices.map((originalIdx, displayIdx) => (
          <div
            key={routes[originalIdx].route.segments.map(s => s.lineCode).join('-')}
            className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both"
            style={{ animationDelay: `${displayIdx * 60}ms`, animationDuration: '250ms' }}
          >
            <RouteOptionBubbles
              labeledRoute={routes[originalIdx]}
              selected={originalIdx === selectedIndex}
              onClick={() => onSelect(originalIdx)}
              disruptions={disruptions}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
