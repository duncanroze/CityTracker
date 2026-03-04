'use client';

import type { RouteResult, NavigationPhase } from '@/types';
import { cn } from '@/lib/utils';

interface NavigationProgressProps {
  route: RouteResult;
  phase: NavigationPhase;
}

interface Step {
  key: string;
  label: string;
}

function getSteps(route: RouteResult): Step[] {
  const steps: Step[] = [];

  if (route.walkingFrom) {
    steps.push({ key: 'walk-start', label: 'Marche' });
  }

  for (let i = 0; i < route.segments.length; i++) {
    steps.push({ key: `seg-${i}`, label: route.segments[i].lineCode });
    if (route.transfers[i]) {
      steps.push({ key: `transfer-${i}`, label: 'Corresp.' });
    }
  }

  if (route.walkingTo) {
    steps.push({ key: 'walk-end', label: 'Marche' });
  }

  steps.push({ key: 'arrived', label: 'Arrivée' });

  return steps;
}

function getCurrentStepIndex(route: RouteResult, phase: NavigationPhase): number {
  let idx = 0;

  switch (phase.type) {
    case 'walking_to_station':
      return 0;

    case 'waiting_for_train':
    case 'riding': {
      if (route.walkingFrom) idx++;
      for (let i = 0; i < phase.segmentIndex; i++) {
        idx++; // segment
        if (route.transfers[i]) idx++; // transfer after it
      }
      return idx;
    }

    case 'transfer_walking': {
      if (route.walkingFrom) idx++;
      for (let i = 0; i <= phase.transferIndex; i++) {
        idx++; // segment
        if (i === phase.transferIndex) {
          // We're at this transfer
          return idx;
        }
        if (route.transfers[i]) idx++; // transfer
      }
      return idx;
    }

    case 'walking_to_destination': {
      if (route.walkingFrom) idx++;
      for (let i = 0; i < route.segments.length; i++) {
        idx++;
        if (route.transfers[i]) idx++;
      }
      return idx; // the walk-end step
    }

    case 'arrived': {
      const steps = getSteps(route);
      return steps.length - 1;
    }

    default:
      return 0;
  }
}

export default function NavigationProgress({ route, phase }: NavigationProgressProps) {
  const steps = getSteps(route);
  const currentIdx = getCurrentStepIndex(route, phase);

  return (
    <div className="flex items-center gap-1 justify-center py-1" role="progressbar" aria-label="Progression du trajet" aria-valuenow={currentIdx} aria-valuemin={0} aria-valuemax={steps.length - 1}>
      {steps.map((step, i) => (
        <div key={step.key} className="flex items-center gap-1">
          <div
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              i < currentIdx && 'bg-emerald-500',
              i === currentIdx && 'bg-blue-500 ring-2 ring-blue-500/30 scale-125',
              i > currentIdx && 'bg-muted-foreground/30',
            )}
            title={step.label}
          />
          {i < steps.length - 1 && (
            <div
              className={cn(
                'w-3 h-0.5 rounded-full',
                i < currentIdx ? 'bg-emerald-500' : 'bg-muted-foreground/20',
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
