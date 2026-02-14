import type { RouteResult } from '../types';

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

interface RouteSummaryProps {
  route: RouteResult;
}

export default function RouteSummary({ route }: RouteSummaryProps) {
  const totalWait = route.segments.reduce((sum, s) => sum + (s.waitTimeSeconds ?? 0), 0);
  const hasWaitData = totalWait > 0;

  return (
    <div className="flex items-center gap-6 text-sm">
      <div>
        <span className="text-gray-500">Duration</span>
        <p className="font-semibold text-gray-900">{formatDuration(route.totalDurationSeconds)}</p>
        {hasWaitData && (
          <p className="text-xs text-gray-400">
            dont ~{Math.ceil(totalWait / 60)} min d'attente
          </p>
        )}
      </div>
      <div>
        <span className="text-gray-500">Stations</span>
        <p className="font-semibold text-gray-900">{route.totalStations}</p>
      </div>
      <div>
        <span className="text-gray-500">Transfers</span>
        <p className="font-semibold text-gray-900">{route.totalTransfers}</p>
      </div>
    </div>
  );
}
