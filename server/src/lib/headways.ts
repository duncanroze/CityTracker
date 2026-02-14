/**
 * Tracks per-line headway (interval between trains).
 * Updated from real-time PRIM data; falls back to transport-type defaults.
 * Used by the pathfinder as boarding penalty = headway / 2.
 */

// Reasonable off-peak defaults (seconds)
const DEFAULT_HEADWAYS: Record<string, number> = {
  metro: 150,   // ~2.5 min
  rer: 600,     // ~10 min
  tram: 420,    // ~7 min
};

interface CachedHeadway {
  headwaySeconds: number;
  updatedAt: number;
}

const headwayCache = new Map<string, CachedHeadway>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getLineHeadway(lineCode: string, transportType: string): number {
  const cached = headwayCache.get(lineCode);
  if (cached && Date.now() - cached.updatedAt < CACHE_TTL) {
    return cached.headwaySeconds;
  }
  return DEFAULT_HEADWAYS[transportType.toLowerCase()] ?? 180;
}

export function updateLineHeadway(lineCode: string, departureTimes: Date[]): void {
  if (departureTimes.length < 2) return;

  const gaps: number[] = [];
  for (let i = 1; i < departureTimes.length; i++) {
    const gap = (departureTimes[i].getTime() - departureTimes[i - 1].getTime()) / 1000;
    if (gap > 0 && gap < 1800) { // ignore gaps > 30min (service break)
      gaps.push(gap);
    }
  }

  if (gaps.length === 0) return;

  const avgHeadway = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  headwayCache.set(lineCode, {
    headwaySeconds: Math.round(avgHeadway),
    updatedAt: Date.now(),
  });
}

/** Expected wait = headway / 2 */
export function getBoardingPenalty(lineCode: string, transportType: string): number {
  return Math.round(getLineHeadway(lineCode, transportType) / 2);
}
