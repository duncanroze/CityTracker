import { getGraph, type TransportGraph, type LineStopInfo } from './graph';
import { getBoardingPenalty } from './headways';
import type { RouteSegment, Transfer, RouteResult, LabeledRoute, MultiRouteResult } from '@/types';

export type { RouteSegment, Transfer, RouteResult, LabeledRoute, MultiRouteResult };

interface QueueEntry {
  lineStopId: string;
  distance: number;
}

interface FindRouteOptions {
  excludeLines?: Set<string>;
  /** Multiplier on transfer penalties (1 = normal, higher = avoid transfers) */
  transferPenaltyMultiplier?: number;
}

export async function findRoute(
  fromStationId: string,
  toStationId: string,
  options?: FindRouteOptions,
): Promise<RouteResult> {
  const { excludeLines, transferPenaltyMultiplier = 1 } = options ?? {};
  const graph = await getGraph();

  const originStops = graph.stationToLineStops.get(fromStationId);
  const destStops = graph.stationToLineStops.get(toStationId);

  if (!originStops || !destStops) {
    return {
      found: false,
      totalDurationSeconds: 0,
      totalStations: 0,
      totalTransfers: 0,
      segments: [],
      transfers: [],
    };
  }

  const destSet = new Set(destStops);

  // Dijkstra
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();

  // Simple priority queue (binary heap would be better but this is ~500 nodes)
  const queue: QueueEntry[] = [];

  function enqueue(lineStopId: string, distance: number) {
    queue.push({ lineStopId, distance });
    // Bubble up
    let i = queue.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (queue[parent].distance <= queue[i].distance) break;
      [queue[parent], queue[i]] = [queue[i], queue[parent]];
      i = parent;
    }
  }

  function dequeue(): QueueEntry | undefined {
    if (queue.length === 0) return undefined;
    const min = queue[0];
    const last = queue.pop()!;
    if (queue.length > 0) {
      queue[0] = last;
      let i = 0;
      while (true) {
        let smallest = i;
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        if (left < queue.length && queue[left].distance < queue[smallest].distance) smallest = left;
        if (right < queue.length && queue[right].distance < queue[smallest].distance) smallest = right;
        if (smallest === i) break;
        [queue[i], queue[smallest]] = [queue[smallest], queue[i]];
        i = smallest;
      }
    }
    return min;
  }

  // Seed with all origin line stops (skip excluded lines)
  // Each origin gets a boarding penalty = headway/2 (expected wait for first train)
  for (const lsId of originStops) {
    const info = graph.lineStopInfo.get(lsId);
    if (!info) continue;
    if (excludeLines && excludeLines.has(info.lineCode)) continue;
    const boarding = getBoardingPenalty(info.lineCode, info.transportType);
    dist.set(lsId, boarding);
    prev.set(lsId, null);
    enqueue(lsId, boarding);
  }

  let foundLineStopId: string | null = null;

  while (queue.length > 0) {
    const { lineStopId, distance } = dequeue()!;

    if (visited.has(lineStopId)) continue;
    visited.add(lineStopId);

    if (destSet.has(lineStopId)) {
      foundLineStopId = lineStopId;
      break;
    }

    const edges = graph.adjacency.get(lineStopId);
    if (!edges) continue;

    for (const edge of edges) {
      // Skip edges leading to excluded lines (both travel and transfer)
      if (excludeLines) {
        const targetInfo = graph.lineStopInfo.get(edge.toLineStopId);
        if (targetInfo && excludeLines.has(targetInfo.lineCode)) continue;
      }
      // When transferring, add boarding penalty for the target line (headway/2)
      let penalty = 0;
      if (edge.type === 'transfer') {
        const targetInfo = graph.lineStopInfo.get(edge.toLineStopId);
        if (targetInfo) {
          penalty = getBoardingPenalty(targetInfo.lineCode, targetInfo.transportType) * transferPenaltyMultiplier;
        }
      }
      const newDist = distance + edge.weight + penalty;
      const currentDist = dist.get(edge.toLineStopId);

      if (currentDist === undefined || newDist < currentDist) {
        dist.set(edge.toLineStopId, newDist);
        prev.set(edge.toLineStopId, lineStopId);
        enqueue(edge.toLineStopId, newDist);
      }
    }
  }

  if (!foundLineStopId) {
    return {
      found: false,
      totalDurationSeconds: 0,
      totalStations: 0,
      totalTransfers: 0,
      segments: [],
      transfers: [],
    };
  }

  // Reconstruct path
  const path: string[] = [];
  let current: string | null = foundLineStopId;
  while (current !== null) {
    path.unshift(current);
    current = prev.get(current) ?? null;
  }

  return buildRouteResult(graph, path);
}

function buildRouteResult(graph: TransportGraph, path: string[]): RouteResult {
  const segments: RouteSegment[] = [];
  const transfers: Transfer[] = [];

  let currentSegmentStops: LineStopInfo[] = [];
  let segmentStartDist = 0;
  let currentLineId: string | null = null;

  for (let i = 0; i < path.length; i++) {
    const info = graph.lineStopInfo.get(path[i])!;

    if (currentLineId === null) {
      // First stop
      currentLineId = info.lineId;
      currentSegmentStops = [info];
      segmentStartDist = 0;
    } else if (info.lineId === currentLineId) {
      // Same line — continue segment
      currentSegmentStops.push(info);
    } else {
      // Line changed — close current segment, add transfer
      const prevInfo = graph.lineStopInfo.get(path[i - 1])!;
      pushSegment(segments, currentSegmentStops, graph, path, segmentStartDist, i - 1);

      // Find the transfer edge weight
      const edges = graph.adjacency.get(path[i - 1])!;
      const transferEdge = edges.find(
        (e) => e.toLineStopId === path[i] && e.type === 'transfer',
      );

      transfers.push({
        fromLineCode: prevInfo.lineCode,
        toLineCode: info.lineCode,
        stationName: info.stationName,
        walkingTimeSeconds: transferEdge?.weight ?? 0,
      });

      // Start new segment
      currentLineId = info.lineId;
      currentSegmentStops = [info];
      segmentStartDist = i;
    }
  }

  // Push final segment
  if (currentSegmentStops.length > 0) {
    pushSegment(segments, currentSegmentStops, graph, path, segmentStartDist, path.length - 1);
  }

  // Calculate total real duration (without penalties)
  let totalDuration = 0;
  for (const seg of segments) totalDuration += seg.durationSeconds;
  for (const t of transfers) totalDuration += t.walkingTimeSeconds;

  const totalStations = segments.reduce((sum, s) => sum + s.stops.length, 0);

  return {
    found: true,
    totalDurationSeconds: totalDuration,
    totalStations,
    totalTransfers: transfers.length,
    segments,
    transfers,
  };
}

function pushSegment(
  segments: RouteSegment[],
  stops: LineStopInfo[],
  graph: TransportGraph,
  path: string[],
  startIdx: number,
  endIdx: number,
) {
  // Calculate duration by summing travel edge weights
  let duration = 0;
  for (let i = startIdx; i < endIdx; i++) {
    const edges = graph.adjacency.get(path[i]);
    if (edges) {
      const travelEdge = edges.find(
        (e) => e.toLineStopId === path[i + 1] && e.type === 'travel',
      );
      if (travelEdge) duration += travelEdge.weight;
    }
  }

  const first = stops[0];
  const last = stops[stops.length - 1];

  // Determine direction (terminus) based on travel direction.
  // Use the last two stops to determine local direction — this handles cross-branch
  // segments where positions jump at junctions (e.g., branch pos 109 → trunk pos 6).
  let direction = '';
  const goingForward = stops.length >= 2
    ? stops[stops.length - 1].position > stops[stops.length - 2].position
    : true;

  // Try branch-specific termini first (for RER lines with branches)
  const branches = graph.branchTermini.get(first.lineId);
  if (branches && branches.length > 0 && stops.length >= 2) {
    // Find which branch the last stop is on by matching its position range
    const lastPos = last.position;
    const matchedBranch = branches.find((b) => {
      // A stop is on a branch if its name matches either terminus
      return b.last === last.stationName || b.first === last.stationName;
    });

    if (matchedBranch) {
      direction = goingForward ? matchedBranch.last : matchedBranch.first;
    } else {
      // Last stop is in the middle of a branch — find branch by checking all stops
      direction = goingForward
        ? branches.find((b) => b.last !== first.stationName)?.last ?? branches[0].last
        : branches.find((b) => b.first !== first.stationName)?.first ?? branches[0].first;
    }
  }

  // Fallback to global termini for lines without branches
  if (!direction) {
    const termini = graph.lineTermini.get(first.lineId);
    if (termini && stops.length >= 2) {
      direction = goingForward ? termini.last : termini.first;
    } else if (termini) {
      direction = termini.last;
    }
  }

  segments.push({
    lineCode: first.lineCode,
    lineName: first.lineName,
    lineColor: first.lineColor,
    lineTextColor: first.lineTextColor,
    transportType: first.transportType,
    direction,
    stops: stops.map((s) => ({ stationName: s.stationName, stationId: s.stationId, lat: s.lat, lng: s.lng })),
    durationSeconds: duration,
  });
}

function routeFingerprint(route: RouteResult): string {
  return route.segments.map((s) => s.lineCode).sort().join(',');
}

export type RouteStrategy = 'fastest' | 'fewest_transfers' | 'least_walking';

export async function findRoutes(
  fromStationId: string,
  toStationId: string,
  strategy: RouteStrategy = 'fastest',
): Promise<MultiRouteResult> {
  const seen = new Set<string>();
  const candidates: RouteResult[] = [];
  const MAX_ROUTES = 5;

  function addCandidate(route: RouteResult) {
    if (!route.found) return;
    const fp = routeFingerprint(route);
    if (seen.has(fp)) return;
    seen.add(fp);
    candidates.push(route);
  }

  // 1. Fastest route (normal transfer penalties)
  const fastest = await findRoute(fromStationId, toStationId);
  if (!fastest.found) {
    return { found: false, routes: [] };
  }
  addCandidate(fastest);

  // 2. Run with increasing transfer penalty to discover fewer-transfer routes
  for (const multiplier of [4, 8, 15]) {
    addCandidate(await findRoute(fromStationId, toStationId, { transferPenaltyMultiplier: multiplier }));
  }

  // 3. Iteratively discover alternatives by excluding middle lines.
  const processedExclusions = new Set<string>();
  let lastCandidateCount = 0;

  for (let round = 0; round < 3; round++) {
    if (candidates.length >= MAX_ROUTES * 2) break;
    if (candidates.length === lastCandidateCount && round > 0) break;
    lastCandidateCount = candidates.length;

    const allMiddle = [
      ...new Set(
        candidates.flatMap((c) => {
          const codes = c.segments.map((s) => s.lineCode);
          return codes.slice(1, -1);
        }),
      ),
    ];

    const exclusionSets: Set<string>[] = [
      ...allMiddle.map((l) => new Set([l])),
      ...allMiddle.flatMap((a, i) =>
        allMiddle.slice(i + 1).map((b) => new Set([a, b])),
      ),
      ...candidates.map((c) => {
        const codes = c.segments.map((s) => s.lineCode);
        return new Set(codes.slice(1, -1));
      }),
      new Set(allMiddle),
    ];

    for (const excludeSet of exclusionSets) {
      if (candidates.length >= MAX_ROUTES * 2) break;
      if (excludeSet.size === 0) continue;
      const key = [...excludeSet].sort().join(',');
      if (processedExclusions.has(key)) continue;
      processedExclusions.add(key);
      addCandidate(await findRoute(fromStationId, toStationId, { excludeLines: excludeSet }));
    }
  }

  // Sort candidates based on strategy, always tie-break by duration
  const transferWalkTime = (r: RouteResult) =>
    r.transfers.reduce((sum, t) => sum + t.walkingTimeSeconds, 0);

  if (strategy === 'fewest_transfers') {
    candidates.sort((a, b) =>
      a.totalTransfers - b.totalTransfers || a.totalDurationSeconds - b.totalDurationSeconds,
    );
  } else if (strategy === 'least_walking') {
    candidates.sort((a, b) =>
      transferWalkTime(a) - transferWalkTime(b) || a.totalDurationSeconds - b.totalDurationSeconds,
    );
  } else {
    candidates.sort((a, b) => a.totalDurationSeconds - b.totalDurationSeconds);
  }

  const topRoutes = candidates.slice(0, MAX_ROUTES);

  return {
    found: true,
    routes: topRoutes.map((route, i) => ({
      label: i === 0 ? 'Fastest' : `Option ${i + 1}`,
      route,
    })),
  };
}
