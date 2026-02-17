/**
 * Enriches route results with real-time departure data from PRIM.
 * Adds nextDepartures and waitTimeSeconds to each segment.
 *
 * Processes segments sequentially: the estimated arrival time at each
 * transfer station accounts for previous travel + wait + walking times.
 */

import { prisma } from "./prisma.js";
import { getNextDepartures } from "./prim.js";
import { getBoardingPenalty, updateLineHeadway } from "./headways.js";
import type { RouteResult, RouteSegment } from "./pathfinder.js";

/**
 * Pre-fetch PRIM data for all segments in parallel, then process sequentially
 * to compute wait times based on cumulative arrival.
 */
export async function enrichRouteWithDepartures(route: RouteResult): Promise<RouteResult> {
  if (!route.found || route.segments.length === 0) return route;

  // 1. Fetch all PRIM data in parallel (network I/O)
  const prefetched = await Promise.all(
    route.segments.map(async (segment) => {
      const firstStop = segment.stops[0];
      if (!firstStop) return null;

      const lineStop = await prisma.lineStop.findFirst({
        where: {
          stationId: firstStop.stationId,
          line: { code: segment.lineCode },
        },
        include: { idfmMapping: true, line: true },
      });

      if (!lineStop?.idfmMapping) return null;

      const allDepartures = await getNextDepartures(
        lineStop.idfmMapping.idfmStopId,
        lineStop.idfmMapping.isStopArea,
      );

      const idfmLineId = lineStop.line.idfmId;
      const lineDepartures = idfmLineId
        ? allDepartures.filter((d) => d.lineRef.includes(idfmLineId))
        : allDepartures;

      const times = lineDepartures
        .map((d) => new Date(d.expectedDeparture))
        .sort((a, b) => a.getTime() - b.getTime());

      // Update headway cache from real-time data
      updateLineHeadway(segment.lineCode, times);

      return times;
    }),
  );

  // 2. Process sequentially: propagate arrival time through segments
  let arrivalTime = new Date(); // starts at "now"
  const enrichedSegments: RouteSegment[] = [];

  for (let i = 0; i < route.segments.length; i++) {
    const segment = route.segments[i];
    const departureTimes = prefetched[i];

    // Find the first departure AFTER we arrive at this station
    const futureDepartures = departureTimes
      ? departureTimes.filter((d) => d > arrivalTime)
      : [];

    if (futureDepartures.length === 0) {
      // No real-time departure available for our arrival time — use headway estimate
      const waitTimeSeconds = getBoardingPenalty(segment.lineCode, segment.transportType);
      enrichedSegments.push({ ...segment, waitTimeSeconds });
      arrivalTime = new Date(
        arrivalTime.getTime() + (waitTimeSeconds + segment.durationSeconds) * 1000,
      );
      const transfer = route.transfers[i];
      if (transfer) {
        arrivalTime = new Date(arrivalTime.getTime() + transfer.walkingTimeSeconds * 1000);
      }
      continue;
    }

    const nextDeparture = futureDepartures[0];
    const waitTimeSeconds = Math.max(
      0,
      Math.round((nextDeparture.getTime() - arrivalTime.getTime()) / 1000),
    );
    const nextDepartures = futureDepartures
      .slice(0, 3)
      .map((d) => d.toISOString());

    enrichedSegments.push({
      ...segment,
      nextDepartures,
      waitTimeSeconds,
    });

    // Advance: wait + travel on this segment
    arrivalTime = new Date(nextDeparture.getTime() + segment.durationSeconds * 1000);

    // Add transfer walking time to next segment
    const transfer = route.transfers[i];
    if (transfer) {
      arrivalTime = new Date(arrivalTime.getTime() + transfer.walkingTimeSeconds * 1000);
    }
  }

  // Recalculate total duration including real-time wait times
  const totalWaitSeconds = enrichedSegments.reduce(
    (sum, s) => sum + (s.waitTimeSeconds ?? 0),
    0,
  );
  const totalDurationSeconds = enrichedSegments.reduce(
    (sum, s) => sum + s.durationSeconds,
    0,
  ) + route.transfers.reduce(
    (sum, t) => sum + t.walkingTimeSeconds,
    0,
  ) + totalWaitSeconds;

  return {
    ...route,
    segments: enrichedSegments,
    totalDurationSeconds,
  };
}
