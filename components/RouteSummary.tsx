import { Clock, MapPin, ArrowLeftRight, Flag } from 'lucide-react';
import type { RouteResult } from '@/types';
import { Separator } from '@/components/ui/separator';

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

function formatEta(durationSeconds: number): string {
  const eta = new Date(Date.now() + durationSeconds * 1000);
  const h = eta.getHours();
  const m = String(eta.getMinutes()).padStart(2, '0');
  return `${h}h${m}`;
}

interface RouteSummaryProps {
  route: RouteResult;
}

export default function RouteSummary({ route }: RouteSummaryProps) {
  const totalWait = route.segments.reduce((sum, s) => sum + (s.waitTimeSeconds ?? 0), 0);
  const hasWaitData = totalWait > 0;

  return (
    <>
      <div className="grid grid-cols-4 gap-3 text-center">
        <div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Durée</span>
          </div>
          <p className="text-lg font-semibold">{formatDuration(route.totalDurationSeconds)}</p>
          {hasWaitData && (
            <p className="text-[11px] text-muted-foreground">
              dont ~{Math.ceil(totalWait / 60)} min d&apos;attente
            </p>
          )}
        </div>
        <div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Flag className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Arrivée</span>
          </div>
          <p className="text-lg font-semibold">{formatEta(route.totalDurationSeconds)}</p>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Stations</span>
          </div>
          <p className="text-lg font-semibold">{route.totalStations}</p>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Corresp.</span>
          </div>
          <p className="text-lg font-semibold">{route.totalTransfers}</p>
        </div>
      </div>
      <Separator />
    </>
  );
}
