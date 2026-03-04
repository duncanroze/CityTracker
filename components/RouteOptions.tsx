'use client';

import { Clock, ArrowLeftRight, Footprints } from 'lucide-react';
import type { LabeledRoute } from '@/types';
import type { SortStrategy } from '@/hooks/useRoute';
import type { DisruptionsMap } from '@/hooks/useDisruptions';
import RouteOptionBubbles from './RouteOptionBubbles';
import { cn } from '@/lib/utils';

const SORT_OPTIONS: { key: SortStrategy; label: string; icon: typeof Clock }[] = [
  { key: 'fastest', label: 'Rapide', icon: Clock },
  { key: 'fewest_transfers', label: 'Corresp.', icon: ArrowLeftRight },
  { key: 'least_walking', label: 'Marche', icon: Footprints },
];

interface RouteOptionsProps {
  routes: LabeledRoute[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  disruptions?: DisruptionsMap;
  strategy: SortStrategy;
  onChangeStrategy: (strategy: SortStrategy) => void;
  loading?: boolean;
}

export default function RouteOptions({ routes, selectedIndex, onSelect, disruptions, strategy, onChangeStrategy, loading }: RouteOptionsProps) {
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
                onClick={() => onChangeStrategy(opt.key)}
                disabled={loading}
                className={cn(
                  'flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1',
                  strategy === opt.key
                    ? 'bg-foreground/10 text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                  loading && 'opacity-50 cursor-wait',
                )}
              >
                <Icon className="w-3 h-3" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className={cn('grid gap-2 transition-opacity duration-200', loading && 'opacity-40 pointer-events-none')}>
        {loading && (
          <div className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground">
            <span className="w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            Mise à jour...
          </div>
        )}
        {routes.map((route, idx) => (
          <div
            key={`${strategy}-${idx}`}
            className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both"
            style={{ animationDelay: `${idx * 60}ms`, animationDuration: '250ms' }}
          >
            <RouteOptionBubbles
              labeledRoute={route}
              selected={idx === selectedIndex}
              onClick={() => onSelect(idx)}
              disruptions={disruptions}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
