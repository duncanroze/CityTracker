'use client';

import { useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useLines } from '@/hooks/useLines';
import { useDisruptions } from '@/hooks/useDisruptions';
import { useMapContext } from '@/contexts/MapContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import LineBadge from '@/components/LineBadge';
import { cn } from '@/lib/utils';

export default function LigneDetailPage() {
  const params = useParams<{ lineCode: string }>();
  const lineCode = params.lineCode;
  const { lines, loading, error } = useLines();
  const disruptions = useDisruptions();
  const { setLineOverlay, clearOverlay } = useMapContext();

  const line = useMemo(
    () => lines.find((l) => l.code === lineCode),
    [lines, lineCode]
  );

  const disruption = lineCode ? disruptions[lineCode] : undefined;

  // Push line overlay to map
  useEffect(() => {
    if (line) {
      setLineOverlay(line);
    }
    return () => clearOverlay();
  }, [line, setLineOverlay, clearOverlay]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">
        Erreur : {error}
      </div>
    );
  }

  if (!line) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">
          Ligne introuvable : {lineCode}
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/lignes">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/lignes">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Toutes les lignes
        </Link>
      </Button>

      {/* Line header */}
      <div className="flex items-center gap-3">
        <LineBadge
          code={line.code}
          color={line.color}
          textColor={line.textColor}
          shape={line.transportType === 'METRO' ? 'circle' : 'rounded'}
          size="lg"
          disruption={disruption?.severity}
        />
        <div>
          <h2 className="text-lg font-semibold">{line.name}</h2>
          <p className="text-xs text-muted-foreground">{line.stations.length} stations</p>
        </div>
      </div>

      {/* Disruption alert */}
      {disruption && (
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs rounded-md px-3 py-2',
            disruption.severity === 'interrupted'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="font-medium">
            {disruption.severity === 'interrupted' ? 'Trafic interrompu' : 'Trafic perturbé'}
          </span>
          {disruption.message && (
            <span className="text-muted-foreground">— {disruption.message}</span>
          )}
        </div>
      )}

      {/* Station list as vertical timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute left-[11px] top-2 bottom-2 w-1 rounded-full"
          style={{ backgroundColor: line.color }}
        />

        <div className="space-y-0">
          {line.stations.map((station, i) => {
            const isFirst = i === 0;
            const isLast = i === line.stations.length - 1;
            const isTerminus = isFirst || isLast;

            return (
              <div key={station.id} className="flex items-center gap-3 py-1.5 pl-1 relative">
                <div
                  className={cn(
                    'shrink-0 rounded-full z-10',
                    isTerminus ? 'w-[22px] h-[22px]' : 'w-3 h-3 ml-[5px]'
                  )}
                  style={{
                    backgroundColor: isTerminus ? line.color : undefined,
                    border: isTerminus ? `3px solid ${line.color}` : `2.5px solid ${line.color}`,
                    ...(isTerminus
                      ? {}
                      : { backgroundColor: 'var(--background)' }),
                  }}
                />
                <span
                  className={cn(
                    'text-sm',
                    isTerminus ? 'font-semibold' : 'text-muted-foreground'
                  )}
                >
                  {station.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
