'use client';

import { X, Flag } from 'lucide-react';
import type { UseNavigationReturn } from '@/hooks/useNavigation';
import NavigationStepCard from './NavigationStepCard';
import NavigationProgress from './NavigationProgress';
import NavigationRouteDetail from './NavigationRouteDetail';
import DescentAlert from './DescentAlert';

function formatEta(durationSeconds: number): string {
  const eta = new Date(Date.now() + durationSeconds * 1000);
  const h = eta.getHours();
  const m = String(eta.getMinutes()).padStart(2, '0');
  return `${h}h${m}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins === 0) return '< 1 min';
  return `${mins} min`;
}

interface NavigationViewProps {
  navigation: UseNavigationReturn;
}

export default function NavigationView({ navigation }: NavigationViewProps) {
  const { state, adjustedTotalDuration, stopNavigation, selectDeparture, dismissDescentAlert } = navigation;
  if (!state) return null;

  const { route, phase, selectedDepartures, etaDeltaSeconds, descentAlertShown, descentAlertDismissed } = state;
  const showDescentAlert = descentAlertShown && !descentAlertDismissed && phase.type === 'riding';

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold">Navigation active</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Arrivée</p>
            <p className="text-sm font-semibold">
              {formatEta(adjustedTotalDuration)}
              {etaDeltaSeconds !== 0 && (
                <span className="text-xs text-amber-500 ml-1">
                  ({etaDeltaSeconds > 0 ? '+' : ''}{Math.round(etaDeltaSeconds / 60)} min)
                </span>
              )}
            </p>
          </div>
          <button
            onClick={stopNavigation}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground hover:border-destructive/50 hover:bg-destructive/10"
            aria-label="Arrêter la navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Duration */}
      <p className="text-xs text-muted-foreground">
        Durée restante : {formatDuration(adjustedTotalDuration)}
      </p>

      {/* Progress dots */}
      <NavigationProgress route={route} phase={phase} />

      {/* Descent alert */}
      {showDescentAlert && phase.type === 'riding' && (
        <DescentAlert
          stationName={route.segments[phase.segmentIndex]?.stops[route.segments[phase.segmentIndex].stops.length - 1]?.stationName ?? ''}
          onDismiss={dismissDescentAlert}
        />
      )}

      {/* Current step card */}
      <NavigationStepCard
        route={route}
        phase={phase}
        selectedDepartures={selectedDepartures}
        onSelectDeparture={selectDeparture}
      />

      {/* Full route detail with live progress */}
      {phase.type !== 'arrived' && (
        <NavigationRouteDetail route={route} phase={phase} />
      )}
    </div>
  );
}
