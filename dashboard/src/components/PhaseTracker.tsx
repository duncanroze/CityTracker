import { cn } from '../lib/utils';
import { PHASES } from '../lib/config';
import { ClipboardList, Zap, Search, FlaskConical, RefreshCw } from 'lucide-react';
import type { PipelinePhase } from '../lib/types';

const PHASE_ICONS = [ClipboardList, Zap, Search, FlaskConical];

interface PhaseTrackerProps {
  currentPhase: PipelinePhase;
  iterations?: number;
  maxIterations?: number;
}

export default function PhaseTracker({ currentPhase, iterations = 0, maxIterations = 3 }: PhaseTrackerProps) {
  return (
    <div className="flex items-center gap-0 rounded-lg border border-border bg-muted px-4 py-2.5">
      {PHASES.map((phase, i) => {
        const isActive = phase.num === currentPhase;
        const isDone = phase.num < currentPhase;
        const Icon = PHASE_ICONS[i];

        return (
          <div key={phase.num} className="flex items-center">
            <div
              className={cn(
                'flex flex-col items-center gap-1 transition-all duration-300',
                isActive ? 'opacity-100' : isDone ? 'opacity-80' : 'opacity-35',
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm',
                  isActive && 'border-amber-500 bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
                  isDone && 'border-emerald-500 bg-emerald-500/15',
                  !isActive && !isDone && 'border-border bg-transparent',
                )}
              >
                {isDone ? (
                  <span className="text-emerald-400">&#10003;</span>
                ) : (
                  <Icon className={cn(
                    'h-3.5 w-3.5',
                    isActive ? 'text-amber-400' : 'text-muted-foreground',
                  )} />
                )}
              </div>
              <span
                className={cn(
                  'text-[10px]',
                  isActive ? 'font-bold text-foreground' : 'font-normal text-muted-foreground',
                )}
              >
                {phase.label}
              </span>
            </div>

            {i < PHASES.length - 1 && (
              <div
                className={cn(
                  'mx-1.5 mb-4 h-0.5 w-10 rounded-sm transition-colors duration-300',
                  isDone ? 'bg-indigo-500' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
      {iterations > 0 && (
        <div className="ml-auto flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-500">
            <RefreshCw className="h-3 w-3" />
            {iterations}/{maxIterations}
          </span>
        </div>
      )}
    </div>
  );
}
