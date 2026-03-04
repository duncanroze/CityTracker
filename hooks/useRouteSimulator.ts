'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { buildSimPath, interpolatePosition, getTotalDuration, type SimWaypoint } from '@/lib/route-simulator';
import type { RouteResult } from '@/types';
import type { UserPosition } from '@/contexts/MapContext';

const TICK_MS = 50;

export interface UseRouteSimulatorReturn {
  active: boolean;
  playing: boolean;
  speed: number;
  progress: number;
  phase: string;
  totalDuration: number;
  start: (route: RouteResult) => void;
  stop: () => void;
  togglePlay: () => void;
  setSpeed: (s: number) => void;
}

interface SimulatorDeps {
  setUserPosition: (pos: UserPosition | null) => void;
  updateNavPosition: (lat: number, lng: number) => void;
}

export function useRouteSimulator(deps: SimulatorDeps): UseRouteSimulatorReturn {
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('');
  const [totalDuration, setTotalDuration] = useState(0);

  const pathRef = useRef<SimWaypoint[]>([]);
  const elapsedRef = useRef(0);
  const totalDurationRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedRef = useRef(1);
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    elapsedRef.current += (TICK_MS / 1000) * speedRef.current;
    const pos = interpolatePosition(pathRef.current, elapsedRef.current, totalDurationRef.current);

    if (!pos) {
      // Simulation complete — emit final position
      const last = pathRef.current[pathRef.current.length - 1];
      if (last) {
        depsRef.current.setUserPosition({ lat: last.lat, lng: last.lng, accuracy: 5 });
        depsRef.current.updateNavPosition(last.lat, last.lng);
      }
      setProgress(1);
      setPhase('arrived');
      setPlaying(false);
      return;
    }

    depsRef.current.setUserPosition({ lat: pos.lat, lng: pos.lng, accuracy: 5 });
    depsRef.current.updateNavPosition(pos.lat, pos.lng);
    setProgress(pos.progress);
    setPhase(pos.phase);
  }, []);

  // Start/stop interval when playing state changes
  useEffect(() => {
    clearTick();
    if (playing && active) {
      intervalRef.current = setInterval(tick, TICK_MS);
    }
    return clearTick;
  }, [playing, active, tick, clearTick]);

  const start = useCallback((route: RouteResult) => {
    const path = buildSimPath(route);
    pathRef.current = path;
    elapsedRef.current = 0;
    const dur = getTotalDuration(path);
    totalDurationRef.current = dur;
    speedRef.current = 1;
    setSpeedState(1);
    setProgress(0);
    setPhase(path[0]?.phase ?? '');
    setTotalDuration(dur);
    setActive(true);
    setPlaying(true);
  }, []);

  const stop = useCallback(() => {
    clearTick();
    pathRef.current = [];
    elapsedRef.current = 0;
    setActive(false);
    setPlaying(false);
    setProgress(0);
    setPhase('');
    setTotalDuration(0);
  }, [clearTick]);

  const togglePlay = useCallback(() => {
    setPlaying(p => !p);
  }, []);

  const setSpeed = useCallback((s: number) => {
    speedRef.current = s;
    setSpeedState(s);
  }, []);

  return { active, playing, speed, progress, phase, totalDuration, start, stop, togglePlay, setSpeed };
}
