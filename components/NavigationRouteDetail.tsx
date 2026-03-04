'use client';

import { Footprints, MapPin } from 'lucide-react';
import type { RouteResult, NavigationPhase } from '@/types';
import LineBadge from './LineBadge';
import { cn } from '@/lib/utils';

interface NavigationRouteDetailProps {
  route: RouteResult;
  phase: NavigationPhase;
}

type StepStatus = 'completed' | 'current' | 'future';

/**
 * Determine the status of a segment relative to the current navigation phase.
 */
function getSegmentStatus(segIdx: number, phase: NavigationPhase): StepStatus {
  switch (phase.type) {
    case 'walking_to_station':
      return 'future';
    case 'waiting_for_train':
    case 'riding':
      if (segIdx < phase.segmentIndex) return 'completed';
      if (segIdx === phase.segmentIndex) return 'current';
      return 'future';
    case 'transfer_walking':
      if (segIdx <= phase.transferIndex) return 'completed';
      return 'future';
    case 'walking_to_destination':
    case 'arrived':
      return 'completed';
    default:
      return 'future';
  }
}

function getWalkingFromStatus(phase: NavigationPhase): StepStatus {
  if (phase.type === 'walking_to_station') return 'current';
  return 'completed';
}

function getTransferStatus(transferIdx: number, phase: NavigationPhase): StepStatus {
  switch (phase.type) {
    case 'walking_to_station':
      return 'future';
    case 'waiting_for_train':
    case 'riding':
      if (transferIdx < phase.segmentIndex) return 'completed';
      return 'future';
    case 'transfer_walking':
      if (transferIdx < phase.transferIndex) return 'completed';
      if (transferIdx === phase.transferIndex) return 'current';
      return 'future';
    case 'walking_to_destination':
    case 'arrived':
      return 'completed';
    default:
      return 'future';
  }
}

function getWalkingToStatus(phase: NavigationPhase): StepStatus {
  if (phase.type === 'walking_to_destination') return 'current';
  if (phase.type === 'arrived') return 'completed';
  return 'future';
}

function getCurrentStopIndex(phase: NavigationPhase, segIdx: number): number | null {
  if (phase.type === 'riding' && phase.segmentIndex === segIdx) {
    return phase.currentStopIndex;
  }
  return null;
}

function shortAddress(address: string): string {
  const banMatch = address.match(/^(.+?)\s+\d{5}\s/);
  if (banMatch) return banMatch[1];
  const parts = address.split(',');
  if (parts.length >= 2) return parts.slice(0, 2).join(',').trim();
  return address;
}

export default function NavigationRouteDetail({ route, phase }: NavigationRouteDetailProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Détail du trajet</p>
      <div>
        {/* Walking from */}
        {route.walkingFrom && (
          <WalkingSection
            label={shortAddress(route.walkingFrom.address)}
            stationName={route.walkingFrom.stationName}
            durationSeconds={route.walkingFrom.durationSeconds}
            distanceMeters={route.walkingFrom.distanceMeters}
            direction="from"
            status={getWalkingFromStatus(phase)}
          />
        )}

        {/* Segments + transfers */}
        {route.segments.map((seg, i) => {
          const segStatus = getSegmentStatus(i, phase);
          const currentStop = getCurrentStopIndex(phase, i);
          const isWaiting = phase.type === 'waiting_for_train' && phase.segmentIndex === i;

          return (
            <div key={`${seg.lineCode}-${i}`}>
              {i > 0 && route.transfers[i - 1] && (
                <TransferSection
                  stationName={route.transfers[i - 1].stationName}
                  walkingTimeSeconds={route.transfers[i - 1].walkingTimeSeconds}
                  status={getTransferStatus(i - 1, phase)}
                />
              )}
              <SegmentSection
                segment={seg}
                status={segStatus}
                currentStopIndex={currentStop}
                isWaiting={isWaiting}
              />
            </div>
          );
        })}

        {/* Walking to */}
        {route.walkingTo && (
          <WalkingSection
            label={shortAddress(route.walkingTo.address)}
            stationName={route.walkingTo.stationName}
            durationSeconds={route.walkingTo.durationSeconds}
            distanceMeters={route.walkingTo.distanceMeters}
            direction="to"
            status={getWalkingToStatus(phase)}
          />
        )}
      </div>
    </div>
  );
}

function WalkingSection({
  label,
  stationName,
  durationSeconds,
  distanceMeters,
  direction,
  status,
}: {
  label: string;
  stationName: string;
  durationSeconds: number;
  distanceMeters: number;
  direction: 'from' | 'to';
  status: StepStatus;
}) {
  const mins = Math.round(durationSeconds / 60);
  const dist = distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${Math.round(distanceMeters)} m`;

  return (
    <div className={cn('relative pl-6 py-1.5', status === 'completed' && 'opacity-50')}>
      <div className="absolute left-[7px] top-0 bottom-0 w-0.5 border-l-2 border-dashed border-border" />
      {status === 'current' && (
        <div className="absolute left-[4px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/30 z-10" />
      )}
      <div className="flex items-center gap-2 py-0.5 pl-1">
        <MapPin className="w-3 h-3 shrink-0 text-muted-foreground" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pl-1">
        <Footprints className="w-3 h-3 shrink-0" />
        <span>
          {mins > 0 ? `${mins} min` : `${durationSeconds}s`} · {dist}
          {direction === 'from' ? ` vers ${stationName}` : ` depuis ${stationName}`}
        </span>
      </div>
    </div>
  );
}

function TransferSection({
  stationName,
  walkingTimeSeconds,
  status,
}: {
  stationName: string;
  walkingTimeSeconds: number;
  status: StepStatus;
}) {
  const mins = Math.round(walkingTimeSeconds / 60);

  return (
    <div className={cn('relative pl-6 py-1', status === 'completed' && 'opacity-50')}>
      <div className="absolute left-[7px] top-0 bottom-0 w-0.5 border-l-2 border-dashed border-border" />
      {status === 'current' && (
        <div className="absolute left-[4px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/30 z-10" />
      )}
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pl-1">
        <Footprints className="w-3 h-3 shrink-0" />
        <span>Corresp. {mins > 0 ? `${mins} min` : `${walkingTimeSeconds}s`} à {stationName}</span>
      </div>
    </div>
  );
}

function SegmentSection({
  segment,
  status,
  currentStopIndex,
  isWaiting,
}: {
  segment: RouteResult['segments'][number];
  status: StepStatus;
  currentStopIndex: number | null;
  isWaiting: boolean;
}) {
  const { stops } = segment;

  return (
    <div className={cn('relative pl-6', status === 'completed' && 'opacity-50')}>
      {/* Colored left border */}
      <div
        className="absolute left-[7px] top-0 bottom-0 w-0.5 rounded-full"
        style={{ backgroundColor: status === 'completed' ? 'var(--color-emerald-500, #22c55e)' : segment.lineColor }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 py-1">
        <LineBadge code={segment.lineCode} color={segment.lineColor} textColor={segment.lineTextColor} />
        <span className="text-[11px] text-muted-foreground">dir. {segment.direction}</span>
        <span className="text-[11px] text-muted-foreground ml-auto">{Math.round(segment.durationSeconds / 60)} min</span>
      </div>

      {/* Stops */}
      <div className="space-y-0">
        {stops.map((stop, i) => {
          const isFirst = i === 0;
          const isLast = i === stops.length - 1;
          const isCurrent = currentStopIndex !== null && i === currentStopIndex;
          const isPast = status === 'completed' || (currentStopIndex !== null && i < currentStopIndex);
          const isWaitingHere = isWaiting && isFirst;

          return (
            <div key={i} className="flex items-center gap-2 py-0.5 pl-1">
              {isCurrent || isWaitingHere ? (
                <span className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-500/30 shrink-0" />
              ) : (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={
                    isPast
                      ? { backgroundColor: 'var(--color-emerald-500, #22c55e)' }
                      : isFirst || isLast
                        ? { backgroundColor: segment.lineColor }
                        : { border: '1.5px solid', borderColor: segment.lineColor }
                  }
                />
              )}
              <span className={cn(
                'text-[11px]',
                isCurrent || isWaitingHere ? 'font-semibold text-blue-600 dark:text-blue-400' : '',
                isPast && !isCurrent ? 'text-muted-foreground' : '',
                !isPast && !isCurrent && !isWaitingHere && (isFirst || isLast) ? 'font-medium text-xs' : '',
              )}>
                {stop.stationName}
              </span>
              {isCurrent && (
                <span className="text-[10px] text-blue-500 ml-auto">ici</span>
              )}
              {isWaitingHere && (
                <span className="text-[10px] text-amber-500 ml-auto">en attente</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
