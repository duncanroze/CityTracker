import { getGraph, type TransportGraph, type LineStopInfo } from './graph.js';

interface QueueEntry {
  lineStopId: string;
  distance: number;
}

export interface RouteSegment {
  lineCode: string;
  lineName: string;
  lineColor: string;
  lineTextColor: string;
  transportType: string;
  stops: { stationName: string; stationId: string; lat: number; lng: number }[];
  durationSeconds: number;
  nextDepartures?: string[];
  waitTimeSeconds?: number;
}

export interface Transfer {
  fromLineCode: string;
  toLineCode: string;
  stationName: string;
  walkingTimeSeconds: number;
}

export interface RouteResult {
  found: boolean;
  totalDurationSeconds: number;
  totalStations: number;
  totalTransfers: number;
  segments: RouteSegment[];
  transfers: Transfer[];
}

export interface LabeledRoute {
  label: string;
  route: RouteResult;
}

export interface MultiRouteResult {
  found: boolean;
  routes: LabeledRoute[];
}

export async function findRoute(
  fromStationId: string,
  toStationId: string,
  transferPenalty: number = 30,
): Promise<RouteResult> {
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

  // Seed with all origin line stops
  for (const lsId of originStops) {
    dist.set(lsId, 0);
    prev.set(lsId, null);
    enqueue(lsId, 0);
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
      const penalty = edge.type === 'transfer' ? transferPenalty : 0;
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
  segments.push({
    lineCode: first.lineCode,
    lineName: first.lineName,
    lineColor: first.lineColor,
    lineTextColor: first.lineTextColor,
    transportType: first.transportType,
    stops: stops.map((s) => ({ stationName: s.stationName, stationId: s.stationId, lat: s.lat, lng: s.lng })),
    durationSeconds: duration,
  });
}

function routeFingerprint(route: RouteResult): string {
  const lineCodes = route.segments.map((s) => s.lineCode).sort().join(',');
  const stopCount = route.segments.reduce((sum, s) => sum + s.stops.length, 0);
  return `${lineCodes}|${stopCount}`;
}

export async function findRoutes(
  fromStationId: string,
  toStationId: string,
): Promise<MultiRouteResult> {
  const penalties = [30, 300, 0];
  const seen = new Set<string>();
  const routes: LabeledRoute[] = [];

  for (const penalty of penalties) {
    const result = await findRoute(fromStationId, toStationId, penalty);
    if (!result.found) continue;

    const fp = routeFingerprint(result);
    if (seen.has(fp)) continue;
    seen.add(fp);

    routes.push({ label: '', route: result });
  }

  if (routes.length === 0) {
    return { found: false, routes: [] };
  }

  // Label routes
  // First route (penalty=30) is "Fastest"
  routes[0].label = 'Fastest';

  // Find the one with fewest transfers
  if (routes.length > 1) {
    let minTransfers = routes[0].route.totalTransfers;
    let minIdx = 0;
    for (let i = 1; i < routes.length; i++) {
      if (routes[i].route.totalTransfers < minTransfers) {
        minTransfers = routes[i].route.totalTransfers;
        minIdx = i;
      }
    }
    if (minIdx !== 0) {
      routes[minIdx].label = 'Fewer transfers';
    }
    // Label remaining unlabeled as "Alternative"
    for (const r of routes) {
      if (!r.label) r.label = 'Alternative';
    }
  }

  return { found: true, routes };
}
