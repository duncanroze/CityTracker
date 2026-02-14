import { useState } from 'react';
import type { RouteSegment as RouteSegmentType } from '../types';
import LineBadge from './LineBadge';

interface RouteSegmentProps {
  segment: RouteSegmentType;
}

export default function RouteSegment({ segment }: RouteSegmentProps) {
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
      <div className="flex items-center gap-2 pb-2">
        <LineBadge code={segment.lineCode} color={segment.lineColor} textColor={segment.lineTextColor} />
        <span className="text-sm text-gray-600">{segment.lineName}</span>
        <span className="text-xs text-gray-400 ml-auto">{Math.round(segment.durationSeconds / 60)} min</span>
      </div>

      {/* Real-time departure info */}
      {segment.nextDepartures && segment.nextDepartures.length > 0 && (
        <div className="flex items-center gap-2 pb-2 text-xs">
          <span className="text-emerald-600 font-medium">
            Prochain départ : {new Date(segment.nextDepartures[0]).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {segment.waitTimeSeconds != null && segment.waitTimeSeconds > 0 && (
            <span className="text-gray-400">
              (attente ~{Math.ceil(segment.waitTimeSeconds / 60)} min)
            </span>
          )}
        </div>
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
            className="flex items-center gap-2 py-1.5 pl-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span
              className="w-2 h-2 rounded-full border-2 shrink-0"
              style={{ borderColor: segment.lineColor }}
            />
            <span>{middleStops.length} stops</span>
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
      <span className={`text-sm ${filled ? 'font-medium text-gray-900' : 'text-gray-500'}`}>{name}</span>
    </div>
  );
}
