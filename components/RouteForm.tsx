'use client';

import { useState, useCallback } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';
import type { Station } from '@/types';
import StationPicker from './StationPicker';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface RouteFormProps {
  stations: Station[];
  loading: boolean;
  onSearch: (fromId: string, toId: string) => void;
}

export default function RouteForm({ stations, loading, onSearch }: RouteFormProps) {
  const [from, setFrom] = useState<Station | null>(null);
  const [to, setTo] = useState<Station | null>(null);

  const handleSwap = useCallback(() => {
    setFrom(to);
    setTo(from);
  }, [from, to]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (from && to) onSearch(from.id, to.id);
    },
    [from, to, onSearch],
  );

  return (
    <Card className="py-4 gap-0">
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-2">
          <StationPicker label="Départ" stations={stations} selected={from} onSelect={setFrom} />

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

          <StationPicker label="Arrivée" stations={stations} selected={to} onSelect={setTo} />

          <Button
            type="submit"
            disabled={!from || !to || loading}
            className="w-full"
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
