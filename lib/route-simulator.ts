import { distanceMeters } from './geo-utils';
import type { RouteResult } from '@/types';

export interface SimWaypoint {
  lat: number;
  lng: number;
  /** Speed in m/s to reach the next waypoint (0 for last) */
  speedToNext: number;
  /** Label for UI display */
  phase: string;
}

export interface SimPosition {
  lat: number;
  lng: number;
  phase: string;
  progress: number; // 0–1
}

const WALKING_SPEED = 1.4; // m/s (~5 km/h)
const METRO_SPEED = 8.3; // m/s (~30 km/h avg including stops)
const RER_SPEED = 13.9; // m/s (~50 km/h avg including stops)

function transitSpeed(transportType: string): number {
  if (transportType === 'rer' || transportType === 'transilien') return RER_SPEED;
  return METRO_SPEED;
}

/**
 * Build a flat waypoint path from a RouteResult.
 * The path stitches together: walkingFrom → segments (with transfers) → walkingTo
 */
export function buildSimPath(route: RouteResult): SimWaypoint[] {
  const path: SimWaypoint[] = [];

  // Walking from address to first station
  if (route.walkingFrom) {
    const wf = route.walkingFrom;
    if (wf.path && wf.path.length > 1) {
      for (const [lat, lng] of wf.path) {
        path.push({ lat, lng, speedToNext: WALKING_SPEED, phase: 'walking' });
      }
    } else {
      path.push({ lat: wf.lat, lng: wf.lng, speedToNext: WALKING_SPEED, phase: 'walking' });
      path.push({ lat: wf.stationLat, lng: wf.stationLng, speedToNext: WALKING_SPEED, phase: 'walking' });
    }
  }

  // Transit segments + transfers
  for (let si = 0; si < route.segments.length; si++) {
    const seg = route.segments[si];
    const speed = transitSpeed(seg.transportType);
    const phaseLabel = seg.lineCode;

    for (const stop of seg.stops) {
      path.push({ lat: stop.lat, lng: stop.lng, speedToNext: speed, phase: phaseLabel });
    }

    // Transfer to next segment
    if (si < route.segments.length - 1) {
      const nextSeg = route.segments[si + 1];
      const nextFirstStop = nextSeg.stops[0];
      if (nextFirstStop) {
        const transferLabel = `transfer ${seg.lineCode}→${nextSeg.lineCode}`;
        path.push({
          lat: nextFirstStop.lat,
          lng: nextFirstStop.lng,
          speedToNext: WALKING_SPEED,
          phase: transferLabel,
        });
      }
    }
  }

  // Walking from last station to destination
  if (route.walkingTo) {
    const wt = route.walkingTo;
    if (wt.path && wt.path.length > 1) {
      for (const [lat, lng] of wt.path) {
        path.push({ lat, lng, speedToNext: WALKING_SPEED, phase: 'walking' });
      }
    } else {
      path.push({ lat: wt.stationLat, lng: wt.stationLng, speedToNext: WALKING_SPEED, phase: 'walking' });
      path.push({ lat: wt.lat, lng: wt.lng, speedToNext: WALKING_SPEED, phase: 'walking' });
    }
  }

  // Last waypoint has 0 speed
  if (path.length > 0) {
    path[path.length - 1].speedToNext = 0;
  }

  return path;
}

/** Compute total simulated duration in seconds. */
export function getTotalDuration(path: SimWaypoint[]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = distanceMeters(path[i].lat, path[i].lng, path[i + 1].lat, path[i + 1].lng);
    const speed = path[i].speedToNext || WALKING_SPEED;
    total += d / speed;
  }
  return total;
}

/** Interpolate position along the path at a given elapsed time (seconds).
 *  Pass precomputed totalDuration to avoid recalculating on every tick. */
export function interpolatePosition(path: SimWaypoint[], elapsedSeconds: number, precomputedDuration?: number): SimPosition | null {
  if (path.length === 0) return null;

  const totalDuration = precomputedDuration ?? getTotalDuration(path);
  if (totalDuration <= 0) {
    return { lat: path[0].lat, lng: path[0].lng, phase: path[0].phase, progress: 1 };
  }

  if (elapsedSeconds >= totalDuration) return null; // simulation complete

  let cumulative = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = distanceMeters(path[i].lat, path[i].lng, path[i + 1].lat, path[i + 1].lng);
    const speed = path[i].speedToNext || WALKING_SPEED;
    const segDuration = d / speed;

    if (cumulative + segDuration > elapsedSeconds) {
      const t = (elapsedSeconds - cumulative) / segDuration;
      return {
        lat: path[i].lat + (path[i + 1].lat - path[i].lat) * t,
        lng: path[i].lng + (path[i + 1].lng - path[i].lng) * t,
        phase: path[i].phase,
        progress: elapsedSeconds / totalDuration,
      };
    }

    cumulative += segDuration;
  }

  // At the very end
  const last = path[path.length - 1];
  return { lat: last.lat, lng: last.lng, phase: last.phase, progress: 1 };
}
