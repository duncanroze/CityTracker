import { prisma } from './prisma.js';

export interface Edge {
  toLineStopId: string;
  weight: number;
  type: 'travel' | 'transfer';
}

export interface LineStopInfo {
  id: string;
  lineId: string;
  lineCode: string;
  lineName: string;
  lineColor: string;
  lineTextColor: string;
  transportType: string;
  stationId: string;
  stationName: string;
  position: number;
  lat: number;
  lng: number;
}

export interface TransportGraph {
  adjacency: Map<string, Edge[]>;
  stationToLineStops: Map<string, string[]>;
  lineStopInfo: Map<string, LineStopInfo>;
}

let cachedGraph: TransportGraph | null = null;

export async function getGraph(): Promise<TransportGraph> {
  if (cachedGraph) return cachedGraph;
  cachedGraph = await buildGraph();
  return cachedGraph;
}

async function buildGraph(): Promise<TransportGraph> {
  const lineStops = await prisma.lineStop.findMany({
    include: {
      line: true,
      station: true,
    },
    orderBy: [{ lineId: 'asc' }, { position: 'asc' }],
  });

  const connections = await prisma.connection.findMany();

  const adjacency = new Map<string, Edge[]>();
  const stationToLineStops = new Map<string, string[]>();
  const lineStopInfo = new Map<string, LineStopInfo>();

  // Index line stops by line for building travel edges
  const lineStopsByLine = new Map<string, typeof lineStops>();

  for (const ls of lineStops) {
    // Store info
    lineStopInfo.set(ls.id, {
      id: ls.id,
      lineId: ls.lineId,
      lineCode: ls.line.code,
      lineName: ls.line.name,
      lineColor: ls.line.color,
      lineTextColor: ls.line.textColor,
      transportType: ls.line.transportType,
      stationId: ls.stationId,
      stationName: ls.station.name,
      position: ls.position,
      lat: ls.station.latitude,
      lng: ls.station.longitude,
    });

    // Initialize adjacency
    adjacency.set(ls.id, []);

    // Station → LineStops index
    const existing = stationToLineStops.get(ls.stationId) ?? [];
    existing.push(ls.id);
    stationToLineStops.set(ls.stationId, existing);

    // Group by line
    const lineGroup = lineStopsByLine.get(ls.lineId) ?? [];
    lineGroup.push(ls);
    lineStopsByLine.set(ls.lineId, lineGroup);
  }

  // Build travel edges (consecutive stops on same line, both directions)
  for (const [, stops] of lineStopsByLine) {
    stops.sort((a, b) => a.position - b.position);
    for (let i = 0; i < stops.length - 1; i++) {
      const current = stops[i];
      const next = stops[i + 1];
      const travelTime = current.travelTimeToNext;
      if (travelTime == null) continue;

      // Forward: current → next
      adjacency.get(current.id)!.push({
        toLineStopId: next.id,
        weight: travelTime,
        type: 'travel',
      });

      // Reverse: next → current
      adjacency.get(next.id)!.push({
        toLineStopId: current.id,
        weight: travelTime,
        type: 'travel',
      });
    }
  }

  // Build transfer edges from connections (already bidirectional in DB)
  for (const conn of connections) {
    const edges = adjacency.get(conn.fromLineStopId);
    if (edges) {
      edges.push({
        toLineStopId: conn.toLineStopId,
        weight: conn.walkingTime,
        type: 'transfer',
      });
    }
  }

  return { adjacency, stationToLineStops, lineStopInfo };
}
