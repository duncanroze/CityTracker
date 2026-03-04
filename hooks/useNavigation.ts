'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { RouteResult, NavigationPhase, RouteSegment } from '@/types';
import { distanceMeters } from '@/lib/geo-utils';

interface NavigationState {
  route: RouteResult;
  phase: NavigationPhase;
  /** Per-segment departure index overrides (segmentIndex → departureIndex) */
  selectedDepartures: Record<number, number>;
  /** Cumulative ETA delta in seconds from departure selections */
  etaDeltaSeconds: number;
  descentAlertShown: boolean;
  descentAlertDismissed: boolean;
}

export interface UseNavigationReturn {
  active: boolean;
  state: NavigationState | null;
  adjustedTotalDuration: number;
  startNavigation: (route: RouteResult) => void;
  stopNavigation: () => void;
  selectDeparture: (segmentIndex: number, departureIndex: number) => void;
  dismissDescentAlert: () => void;
  updatePosition: (lat: number, lng: number) => void;
}

function getInitialPhase(route: RouteResult): NavigationPhase {
  if (route.walkingFrom) return { type: 'walking_to_station', segmentIndex: 0 };
  if (route.segments.length > 0) return { type: 'waiting_for_train', segmentIndex: 0, selectedDepartureIndex: 0 };
  return { type: 'arrived' };
}

export function useNavigation(): UseNavigationReturn {
  const [state, setState] = useState<NavigationState | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Tracks phase keys where auto-select already ran, to avoid overriding manual selection */
  const autoSelectedRef = useRef<string | null>(null);

  const active = state !== null;
  const adjustedTotalDuration = state
    ? state.route.totalDurationSeconds + state.etaDeltaSeconds
    : 0;

  const startNavigation = useCallback((route: RouteResult) => {
    setState({
      route,
      phase: getInitialPhase(route),
      selectedDepartures: {},
      etaDeltaSeconds: 0,
      descentAlertShown: false,
      descentAlertDismissed: false,
    });
  }, []);

  const stopNavigation = useCallback(() => {
    setState(null);
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  const selectDeparture = useCallback((segmentIndex: number, departureIndex: number) => {
    setState(prev => {
      if (!prev) return prev;
      const departures = prev.route.segments[segmentIndex]?.nextDepartures;
      if (!departures || departureIndex >= departures.length) return prev;

      const firstDep = new Date(departures[0]).getTime();
      const selectedDep = new Date(departures[departureIndex]).getTime();
      const oldSelected = prev.selectedDepartures[segmentIndex] ?? 0;
      const oldDep = new Date(departures[oldSelected]).getTime();

      // Adjust delta: remove old delta, add new one
      const deltaChange = (selectedDep - oldDep) / 1000;

      return {
        ...prev,
        selectedDepartures: { ...prev.selectedDepartures, [segmentIndex]: departureIndex },
        etaDeltaSeconds: prev.etaDeltaSeconds + Math.round(deltaChange),
        phase: prev.phase.type === 'waiting_for_train' && prev.phase.segmentIndex === segmentIndex
          ? { ...prev.phase, selectedDepartureIndex: departureIndex }
          : prev.phase,
      };
    });
  }, []);

  const dismissDescentAlert = useCallback(() => {
    setState(prev => prev ? { ...prev, descentAlertDismissed: true } : prev);
  }, []);

  const updatePosition = useCallback((lat: number, lng: number) => {
    setState(prev => {
      if (!prev) return prev;
      const { route, phase } = prev;

      switch (phase.type) {
        case 'walking_to_station': {
          // Check if near the first station of the first segment
          const firstStop = route.segments[0]?.stops[0];
          if (firstStop && distanceMeters(lat, lng, firstStop.lat, firstStop.lng) < 50) {
            return { ...prev, phase: { type: 'waiting_for_train', segmentIndex: 0, selectedDepartureIndex: prev.selectedDepartures[0] ?? 0 } };
          }
          return prev;
        }

        case 'waiting_for_train': {
          const segIdx = phase.segmentIndex;
          const seg = route.segments[segIdx];
          const depIdx = phase.selectedDepartureIndex;
          const dep = seg?.nextDepartures?.[depIdx];

          // When the selected departure time has passed, advance to riding
          if (dep && new Date(dep).getTime() < Date.now()) {
            return { ...prev, phase: { type: 'riding', segmentIndex: segIdx, currentStopIndex: 0 } };
          }

          // Position-based advance: if we've moved past the first stop toward the second,
          // we must be on the train (handles accelerated simulation + timing mismatch)
          if (seg) {
            const firstStop = seg.stops[0];
            const secondStop = seg.stops[1];
            if (firstStop && secondStop) {
              const d1 = distanceMeters(lat, lng, firstStop.lat, firstStop.lng);
              const d2 = distanceMeters(lat, lng, secondStop.lat, secondStop.lng);
              if (d2 < d1 || d1 > 200) {
                return { ...prev, phase: { type: 'riding', segmentIndex: segIdx, currentStopIndex: 0 } };
              }
            } else if (firstStop) {
              if (distanceMeters(lat, lng, firstStop.lat, firstStop.lng) > 200) {
                return { ...prev, phase: { type: 'riding', segmentIndex: segIdx, currentStopIndex: 0 } };
              }
            }
          }

          return prev;
        }

        case 'riding': {
          const segIdx = phase.segmentIndex;
          const seg = route.segments[segIdx];
          if (!seg) return prev;

          // Find closest stop
          let closestIdx = phase.currentStopIndex;
          let closestDist = Infinity;
          for (let i = 0; i < seg.stops.length; i++) {
            const d = distanceMeters(lat, lng, seg.stops[i].lat, seg.stops[i].lng);
            if (d < closestDist) {
              closestDist = d;
              closestIdx = i;
            }
          }

          const lastStopIdx = seg.stops.length - 1;
          const nearExit = closestIdx >= lastStopIdx - 1 && closestDist < 200;
          const atExit = closestIdx === lastStopIdx && closestDist < 100;

          // Descent alert
          let descentAlertShown = prev.descentAlertShown;
          if (nearExit && !prev.descentAlertShown) {
            descentAlertShown = true;
            // Trigger vibration and notification
            triggerDescentAlert(seg.stops[lastStopIdx].stationName);
          }

          // Advance to next phase when at exit
          if (atExit) {
            const nextSegIdx = segIdx + 1;
            if (nextSegIdx < route.segments.length) {
              // There's a transfer to the next segment
              if (route.transfers[segIdx]) {
                return { ...prev, phase: { type: 'transfer_walking', transferIndex: segIdx }, descentAlertShown: false, descentAlertDismissed: false };
              }
              return { ...prev, phase: { type: 'waiting_for_train', segmentIndex: nextSegIdx, selectedDepartureIndex: prev.selectedDepartures[nextSegIdx] ?? 0 }, descentAlertShown: false, descentAlertDismissed: false };
            }
            // Last segment — walk to destination or arrived
            if (route.walkingTo) {
              return { ...prev, phase: { type: 'walking_to_destination' }, descentAlertShown: false, descentAlertDismissed: false };
            }
            return { ...prev, phase: { type: 'arrived' }, descentAlertShown: false, descentAlertDismissed: false };
          }

          return { ...prev, phase: { ...phase, currentStopIndex: closestIdx }, descentAlertShown };
        }

        case 'transfer_walking': {
          // Check if near the next segment's first station
          const nextSegIdx = phase.transferIndex + 1;
          const nextSeg = route.segments[nextSegIdx];
          const nextStop = nextSeg?.stops[0];
          if (nextStop && distanceMeters(lat, lng, nextStop.lat, nextStop.lng) < 100) {
            return { ...prev, phase: { type: 'waiting_for_train', segmentIndex: nextSegIdx, selectedDepartureIndex: prev.selectedDepartures[nextSegIdx] ?? 0 } };
          }
          return prev;
        }

        case 'walking_to_destination': {
          // Check if near destination
          const wt = route.walkingTo;
          if (wt && distanceMeters(lat, lng, wt.lat, wt.lng) < 50) {
            return { ...prev, phase: { type: 'arrived' } };
          }
          return prev;
        }

        default:
          return prev;
      }
    });
  }, []);

  // Periodic departure refresh — fetch for the segment we need departures for
  useEffect(() => {
    if (!state?.route) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    // Determine which segment index to fetch departures for
    let targetSegIdx: number | null = null;
    switch (state.phase.type) {
      case 'walking_to_station': targetSegIdx = 0; break;
      case 'waiting_for_train': targetSegIdx = state.phase.segmentIndex; break;
      // While riding or transferring, pre-fetch next segment departures
      case 'riding': targetSegIdx = state.phase.segmentIndex + 1; break;
      case 'transfer_walking': targetSegIdx = state.phase.transferIndex + 1; break;
    }

    if (targetSegIdx === null || targetSegIdx >= state.route.segments.length) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    const lineStopId = state.route.segments[targetSegIdx]?.firstStopLineStopId;
    const segIdx = targetSegIdx;

    // Generate synthetic departures relative to now (for simulation / PRIM unavailable)
    const setSyntheticDepartures = () => {
      const now = Date.now();
      const times = [
        new Date(now + 60_000).toISOString(),
        new Date(now + 240_000).toISOString(),
        new Date(now + 420_000).toISOString(),
        new Date(now + 600_000).toISOString(),
        new Date(now + 780_000).toISOString(),
      ];
      setState(prev => {
        if (!prev) return prev;
        const segments = [...prev.route.segments];
        segments[segIdx] = { ...segments[segIdx], nextDepartures: times };
        return { ...prev, route: { ...prev.route, segments } };
      });
    };

    if (!lineStopId) {
      // No PRIM stop ID — use synthetic departures, refresh every 10s
      setSyntheticDepartures();
      refreshIntervalRef.current = setInterval(setSyntheticDepartures, 10_000);
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }

    const fetchDepartures = async () => {
      try {
        const res = await fetch(`/api/departures?lineStopId=${lineStopId}`);
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        if (data.departures && Array.isArray(data.departures)) {
          const times = data.departures
            .map((d: { expectedTime: string }) => d.expectedTime)
            .slice(0, 5);
          if (times.length > 0) {
            setState(prev => {
              if (!prev) return prev;
              const segments = [...prev.route.segments];
              segments[segIdx] = { ...segments[segIdx], nextDepartures: times };
              return { ...prev, route: { ...prev.route, segments } };
            });
            return;
          }
        }
        // PRIM returned no departures — use synthetic fallback
        setSyntheticDepartures();
      } catch {
        // Fetch failed — use synthetic fallback
        setSyntheticDepartures();
      }
    };

    fetchDepartures();
    refreshIntervalRef.current = setInterval(fetchDepartures, 30_000);
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [state?.phase.type, state?.phase.type === 'waiting_for_train' ? (state.phase as { segmentIndex: number }).segmentIndex : -1,
    state?.phase.type === 'riding' ? (state.phase as { segmentIndex: number }).segmentIndex : -1,
    state?.phase.type === 'transfer_walking' ? (state.phase as { transferIndex: number }).transferIndex : -1]);

  // Auto-select best departure based on ETA — only once per phase transition
  useEffect(() => {
    if (!state?.route) return;

    let segIdx: number | null = null;
    let etaSeconds = 0;
    let phaseKey = '';

    switch (state.phase.type) {
      case 'walking_to_station':
        segIdx = 0;
        etaSeconds = state.route.walkingFrom?.durationSeconds ?? 0;
        phaseKey = 'walk-0';
        break;
      case 'transfer_walking': {
        segIdx = state.phase.transferIndex + 1;
        etaSeconds = state.route.transfers[state.phase.transferIndex]?.walkingTimeSeconds ?? 0;
        phaseKey = `transfer-${state.phase.transferIndex}`;
        break;
      }
      case 'riding': {
        const nextIdx = state.phase.segmentIndex + 1;
        if (nextIdx >= state.route.segments.length) return;
        segIdx = nextIdx;
        const seg = state.route.segments[state.phase.segmentIndex];
        const totalStops = seg.stops.length - 1;
        const stopsLeft = totalStops - state.phase.currentStopIndex;
        const remainingRide = totalStops > 0 ? (stopsLeft / totalStops) * seg.durationSeconds : 0;
        const transferWalk = state.route.transfers[state.phase.segmentIndex]?.walkingTimeSeconds ?? 0;
        etaSeconds = remainingRide + transferWalk;
        phaseKey = `riding-${state.phase.segmentIndex}`;
        break;
      }
      default:
        return;
    }

    // Only auto-select once per phase — don't override manual selection
    if (autoSelectedRef.current === phaseKey) return;

    if (segIdx === null || segIdx >= state.route.segments.length) return;
    const departures = state.route.segments[segIdx]?.nextDepartures;
    if (!departures?.length) return;

    const etaMs = Date.now() + etaSeconds * 1000;

    // Find best departure: first one reachable (departure >= eta)
    let bestIdx = -1;
    for (let i = 0; i < departures.length; i++) {
      if (new Date(departures[i]).getTime() >= etaMs) {
        bestIdx = i;
        break;
      }
    }
    // All unreachable → pick the last one
    if (bestIdx === -1) bestIdx = departures.length - 1;

    autoSelectedRef.current = phaseKey;
    const currentIdx = state.selectedDepartures[segIdx] ?? 0;
    if (bestIdx !== currentIdx) {
      selectDeparture(segIdx, bestIdx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state?.phase.type,
    state?.phase.type === 'walking_to_station' ? state?.route?.segments[0]?.nextDepartures : null,
    state?.phase.type === 'riding' ? (state?.phase as { segmentIndex: number }).segmentIndex : -1,
    state?.phase.type === 'riding' ? state?.route?.segments[(state?.phase as { segmentIndex: number }).segmentIndex + 1]?.nextDepartures : null,
    state?.phase.type === 'transfer_walking' ? state?.route?.segments[(state?.phase as { transferIndex: number }).transferIndex + 1]?.nextDepartures : null,
    selectDeparture,
  ]);

  return {
    active,
    state,
    adjustedTotalDuration,
    startNavigation,
    stopNavigation,
    selectDeparture,
    dismissDescentAlert,
    updatePosition,
  };
}

function triggerDescentAlert(stationName: string) {
  // Vibration
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 200]);
  }
  // Browser notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification('CityTracker', {
      body: `Préparez-vous à descendre à ${stationName}`,
      tag: 'descent-alert',
      requireInteraction: true,
    });
  }
}
