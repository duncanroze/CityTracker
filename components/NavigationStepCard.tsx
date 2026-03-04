'use client';

import { Footprints, TrainFront, MapPin, AlertTriangle } from 'lucide-react';
import type { RouteResult, NavigationPhase } from '@/types';
import LineBadge from './LineBadge';
import DepartureChips from './DepartureChips';
import { cn } from '@/lib/utils';

interface NavigationStepCardProps {
  route: RouteResult;
  phase: NavigationPhase;
  selectedDepartures: Record<number, number>;
  onSelectDeparture: (segmentIndex: number, departureIndex: number) => void;
}

export default function NavigationStepCard({
  route,
  phase,
  selectedDepartures,
  onSelectDeparture,
}: NavigationStepCardProps) {
  switch (phase.type) {
    case 'walking_to_station': {
      const seg = route.segments[0];
      const firstStop = seg?.stops[0];
      const walkingFrom = route.walkingFrom;
      if (!firstStop) return null;
      const mins = walkingFrom ? Math.round(walkingFrom.durationSeconds / 60) : '?';
      const dist = walkingFrom ? formatDistance(walkingFrom.distanceMeters) : '';
      const departures = seg?.nextDepartures ?? [];

      // ETA at station for reachability check
      const walkSec = walkingFrom?.durationSeconds ?? 0;
      const etaMs = Date.now() + walkSec * 1000;

      // Check if the selected departure is tight (< 2 min margin)
      const selIdx = selectedDepartures[0] ?? 0;
      const selDep = departures[selIdx];
      const selMarginSec = selDep ? (new Date(selDep).getTime() - etaMs) / 1000 : Infinity;
      const isTight = selMarginSec >= 0 && selMarginSec < 120;

      return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Footprints className="w-4 h-4 text-muted-foreground" />
            Marchez vers la station
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-sm font-semibold">{firstStop.stationName}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {mins} min de marche{dist ? ` · ${dist}` : ''}
          </p>
          {/* Show upcoming trains while walking */}
          {seg && (
            <div className="border-t border-border pt-2 space-y-2">
              <div className="flex items-center gap-2">
                <LineBadge
                  code={seg.lineCode}
                  color={seg.lineColor}
                  textColor={seg.lineTextColor}
                />
                <span className="text-xs text-muted-foreground">
                  dir. {seg.direction}
                </span>
              </div>
              {departures.length > 0 && (
                <>
                  <DepartureChips
                    departures={departures}
                    selectedIndex={selIdx}
                    onSelect={(idx) => onSelectDeparture(0, idx)}
                    etaMs={etaMs}
                  />
                  {isTight && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>Timing serré — pressez le pas !</span>
                    </div>
                  )}
                </>
              )}
              {departures.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Chargement des horaires...
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    case 'waiting_for_train': {
      const seg = route.segments[phase.segmentIndex];
      if (!seg) return null;
      const departures = seg.nextDepartures ?? [];

      return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrainFront className="w-4 h-4 text-muted-foreground" />
            En attente du prochain train
          </div>
          <div className="flex items-center gap-2">
            <LineBadge
              code={seg.lineCode}
              color={seg.lineColor}
              textColor={seg.lineTextColor}
            />
            <span className="text-sm text-muted-foreground">
              dir. {seg.direction}
            </span>
          </div>
          {departures.length > 0 && (
            <DepartureChips
              departures={departures}
              selectedIndex={selectedDepartures[phase.segmentIndex] ?? 0}
              onSelect={(idx) => onSelectDeparture(phase.segmentIndex, idx)}
            />
          )}
          {departures.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Aucune information en temps réel
            </p>
          )}
        </div>
      );
    }

    case 'riding': {
      const seg = route.segments[phase.segmentIndex];
      if (!seg) return null;
      const currentStop = seg.stops[phase.currentStopIndex];
      const lastStop = seg.stops[seg.stops.length - 1];
      const remaining = seg.stops.length - 1 - phase.currentStopIndex;

      // Next segment info for upcoming transfer
      const nextSegIdx = phase.segmentIndex + 1;
      const nextSeg = route.segments[nextSegIdx];
      const transfer = route.transfers[phase.segmentIndex];
      const nextDepartures = nextSeg?.nextDepartures ?? [];

      // Estimate time to reach next platform: remaining ride + transfer walk
      const totalStops = seg.stops.length - 1;
      const remainingRideSec = totalStops > 0
        ? (remaining / totalStops) * seg.durationSeconds
        : 0;
      const transferWalkSec = transfer?.walkingTimeSeconds ?? 0;
      const etaToNextPlatformSec = Math.round(remainingRideSec + transferWalkSec);
      const etaTime = new Date(Date.now() + etaToNextPlatformSec * 1000);
      const etaTimeStr = `${etaTime.getHours()}h${String(etaTime.getMinutes()).padStart(2, '0')}`;

      return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <LineBadge
              code={seg.lineCode}
              color={seg.lineColor}
              textColor={seg.lineTextColor}
            />
            <span>En route</span>
          </div>
          {currentStop && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border-2"
                  style={{ borderColor: seg.lineColor }}
                />
                <span className="text-sm text-muted-foreground">{currentStop.stationName}</span>
                <span className="text-xs text-muted-foreground ml-auto">actuel</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.lineColor }}
                />
                <span className="text-sm font-medium">{lastStop.stationName}</span>
                <span className="text-xs text-muted-foreground ml-auto">descente</span>
              </div>
            </div>
          )}
          {remaining > 0 && (
            <p className="text-xs text-muted-foreground">
              {remaining} arrêt{remaining > 1 ? 's' : ''} restant{remaining > 1 ? 's' : ''}
            </p>
          )}

          {/* Upcoming transfer: next metro departures + ETA */}
          {nextSeg && transfer && (
            <div className="border-t border-border pt-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">Prochain :</span>
                <LineBadge
                  code={nextSeg.lineCode}
                  color={nextSeg.lineColor}
                  textColor={nextSeg.lineTextColor}
                />
                <span className="text-[11px] text-muted-foreground">
                  dir. {nextSeg.direction}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Arrivée au quai dans ~{Math.ceil(etaToNextPlatformSec / 60)} min
                <span className="font-medium text-foreground ml-1">({etaTimeStr})</span>
                <span className="text-muted-foreground/60 ml-1">
                  · {Math.round(remainingRideSec / 60)} min trajet + {Math.ceil(transferWalkSec / 60)} min marche
                </span>
              </p>
              {nextDepartures.length > 0 && (() => {
                const etaPlatformMs = Date.now() + etaToNextPlatformSec * 1000;
                const selNextIdx = selectedDepartures[nextSegIdx] ?? 0;
                const selNextDep = nextDepartures[selNextIdx];
                const nextMargin = selNextDep ? (new Date(selNextDep).getTime() - etaPlatformMs) / 1000 : Infinity;
                const nextIsTight = nextMargin >= 0 && nextMargin < 120;
                return (
                  <>
                    <DepartureChips
                      departures={nextDepartures}
                      selectedIndex={selNextIdx}
                      onSelect={(idx) => onSelectDeparture(nextSegIdx, idx)}
                      etaMs={etaPlatformMs}
                    />
                    {nextIsTight && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Timing serré pour la correspondance</span>
                      </div>
                    )}
                  </>
                );
              })()}
              {nextDepartures.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Chargement des horaires...
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    case 'transfer_walking': {
      const transfer = route.transfers[phase.transferIndex];
      if (!transfer) return null;
      const nextSegIdx = phase.transferIndex + 1;
      const nextSeg = route.segments[nextSegIdx];
      const mins = Math.round(transfer.walkingTimeSeconds / 60);
      const nextDepartures = nextSeg?.nextDepartures ?? [];

      // ETA at next platform ≈ transfer walking time
      const transferEtaMs = Date.now() + transfer.walkingTimeSeconds * 1000;
      const etaTime = new Date(transferEtaMs);
      const etaTimeStr = `${etaTime.getHours()}h${String(etaTime.getMinutes()).padStart(2, '0')}`;

      return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Footprints className="w-4 h-4 text-muted-foreground" />
            Correspondance
          </div>
          <p className="text-sm">
            Marchez à <span className="font-semibold">{transfer.stationName}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {mins > 0 ? `${mins} min` : '< 1 min'} de marche
          </p>

          {/* Next metro departures + ETA */}
          {nextSeg && (
            <div className="border-t border-border pt-2 space-y-2">
              <div className="flex items-center gap-2">
                <LineBadge
                  code={nextSeg.lineCode}
                  color={nextSeg.lineColor}
                  textColor={nextSeg.lineTextColor}
                />
                <span className="text-xs text-muted-foreground">
                  dir. {nextSeg.direction}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Au quai vers <span className="font-medium text-foreground">{etaTimeStr}</span>
              </p>
              {nextDepartures.length > 0 && (() => {
                const selTransIdx = selectedDepartures[nextSegIdx] ?? 0;
                const selTransDep = nextDepartures[selTransIdx];
                const transMargin = selTransDep ? (new Date(selTransDep).getTime() - transferEtaMs) / 1000 : Infinity;
                const transIsTight = transMargin >= 0 && transMargin < 120;
                return (
                  <>
                    <DepartureChips
                      departures={nextDepartures}
                      selectedIndex={selTransIdx}
                      onSelect={(idx) => onSelectDeparture(nextSegIdx, idx)}
                      etaMs={transferEtaMs}
                    />
                    {transIsTight && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Pressez le pas !</span>
                      </div>
                    )}
                  </>
                );
              })()}
              {nextDepartures.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Chargement des horaires...
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    case 'walking_to_destination': {
      const walkingTo = route.walkingTo;
      if (!walkingTo) return null;
      const mins = Math.round(walkingTo.durationSeconds / 60);

      return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Footprints className="w-4 h-4 text-muted-foreground" />
            Marchez vers votre destination
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-sm font-semibold">{walkingTo.address.split(',')[0]}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {mins} min · {formatDistance(walkingTo.distanceMeters)}
          </p>
        </div>
      );
    }

    case 'arrived': {
      return (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-1">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Vous êtes arrivé !
          </p>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
            Bonne journée
          </p>
        </div>
      );
    }

    default:
      return null;
  }
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}
