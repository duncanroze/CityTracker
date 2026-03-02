'use client';

import { useState, useCallback, useEffect } from 'react';
import { ArrowUpDown, Search, Pencil } from 'lucide-react';
import type { Station, PickerSelection } from '@/types';
import StationPicker from './StationPicker';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RouteFormProps {
  stations: Station[];
  loading: boolean;
  onSearch: (from: PickerSelection, to: PickerSelection) => void;
  onSelectionChange?: (field: 'from' | 'to', selection: PickerSelection | null) => void;
  collapsed?: boolean;
  onExpand?: () => void;
  fromLabel?: string;
  toLabel?: string;
  externalFrom?: PickerSelection | null;
  externalTo?: PickerSelection | null;
}

export default function RouteForm({ stations, loading, onSearch, onSelectionChange, collapsed, onExpand, fromLabel, toLabel, externalFrom, externalTo }: RouteFormProps) {
  const [from, setFrom] = useState<PickerSelection | null>(null);
  const [to, setTo] = useState<PickerSelection | null>(null);

  // Sync external selections (e.g. from favorite click) into internal state
  useEffect(() => {
    if (externalFrom !== undefined) setFrom(externalFrom);
  }, [externalFrom]);
  useEffect(() => {
    if (externalTo !== undefined) setTo(externalTo);
  }, [externalTo]);

  const handleFromChange = useCallback((selection: PickerSelection | null) => {
    setFrom(selection);
    onSelectionChange?.('from', selection);
  }, [onSelectionChange]);

  const handleToChange = useCallback((selection: PickerSelection | null) => {
    setTo(selection);
    onSelectionChange?.('to', selection);
  }, [onSelectionChange]);

  const handleSwap = useCallback(() => {
    setFrom(to);
    setTo(from);
    onSelectionChange?.('from', to ?? null);
    onSelectionChange?.('to', from ?? null);
  }, [from, to, onSelectionChange]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (from && to) onSearch(from, to);
    },
    [from, to, onSearch],
  );

  if (collapsed) {
    return (
      <button onClick={onExpand} className="w-full text-left group">
        <Card className="py-3 gap-0 transition-colors group-hover:border-foreground/20">
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-sm font-medium truncate">{fromLabel}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-transparent shrink-0 relative">
                    <span className="absolute left-[3px] -top-1 w-[2px] h-2 border-l border-dashed border-muted-foreground/40" />
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span className="text-sm font-medium truncate">{toLabel}</span>
                </div>
              </div>
              <Pencil className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </CardContent>
        </Card>
      </button>
    );
  }

  return (
    <Card className="py-4 gap-0 animate-in fade-in duration-200">
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-2">
          <StationPicker label="Départ" stations={stations} selected={from} onSelect={handleFromChange} />

          <div className="flex justify-center -my-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleSwap}
              aria-label="Inverser les stations"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </Button>
          </div>

          <StationPicker label="Arrivée" stations={stations} selected={to} onSelect={handleToChange} />

          <Button
            type="submit"
            disabled={!from || !to || loading}
            className={cn('w-full transition-shadow', from && to && !loading && 'btn-glow-ready')}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Recherche...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Trouver un itinéraire
              </span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
