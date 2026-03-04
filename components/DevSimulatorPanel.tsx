'use client';

import { Play, Pause, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { UseRouteSimulatorReturn } from '@/hooks/useRouteSimulator';
import { cn } from '@/lib/utils';

const SPEED_OPTIONS = [1, 2, 5, 10, 20, 50] as const;

interface DevSimulatorPanelProps {
  simulator: UseRouteSimulatorReturn;
}

export default function DevSimulatorPanel({ simulator }: DevSimulatorPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (!simulator.active) return null;

  const progressPct = Math.round(simulator.progress * 100);
  const elapsed = Math.round(simulator.progress * simulator.totalDuration);
  const total = Math.round(simulator.totalDuration);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-[90] w-56 rounded-lg border border-amber-500/30 bg-black/90 text-white shadow-lg backdrop-blur-sm text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
        <span className="font-mono font-semibold text-amber-400">DEV SIM</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setCollapsed(c => !c)} className="p-0.5 hover:text-amber-400 transition-colors">
            {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button onClick={simulator.stop} className="p-0.5 hover:text-red-400 transition-colors">
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-3 py-2 space-y-2">
          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={simulator.togglePlay}
              className="flex items-center justify-center w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
            >
              {simulator.playing
                ? <Pause className="w-3.5 h-3.5" />
                : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
            <div className="flex items-center gap-0.5">
              {SPEED_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => simulator.setSpeed(s)}
                  className={cn(
                    'px-1.5 py-0.5 rounded font-mono transition-colors',
                    simulator.speed === s
                      ? 'bg-amber-500/30 text-amber-300'
                      : 'text-white/50 hover:text-white/80',
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-100"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-0.5 text-[10px] text-white/40 font-mono">
              <span>{formatTime(elapsed)}</span>
              <span>{progressPct}%</span>
              <span>{formatTime(total)}</span>
            </div>
          </div>

          {/* Phase */}
          <div className="text-[10px] text-white/60 font-mono truncate">
            {simulator.phase || '—'}
          </div>
        </div>
      )}
    </div>
  );
}
