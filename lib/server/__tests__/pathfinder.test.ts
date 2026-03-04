import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TransportGraph, Edge, LineStopInfo } from '../graph';

// Mock graph and headways
vi.mock('../graph', () => ({
  getGraph: vi.fn(),
}));
vi.mock('../headways', () => ({
  getBoardingPenalty: vi.fn().mockReturnValue(0),
}));

/**
 * Build a small synthetic graph for testing:
 *
 * Line A (metro): S1 --60s--> S2 --90s--> S3
 * Line B (rer):   S3 --120s--> S4 --60s--> S5
 * Transfer at S3: Line A <--180s walk--> Line B
 * Line C (tram):  S6 --60s--> S7 (isolated, no connection to A/B)
 */
function buildTestGraph(): TransportGraph {
  const adjacency = new Map<string, Edge[]>();
  const stationToLineStops = new Map<string, string[]>();
  const lineStopInfo = new Map<string, LineStopInfo>();
  const lineTermini = new Map<string, { first: string; last: string }>();
  const branchTermini = new Map<string, { first: string; last: string }[]>();

  // Helper to create a LineStopInfo
  function addStop(id: string, lineId: string, lineCode: string, lineName: string,
    transportType: string, stationId: string, stationName: string, position: number) {
    const info: LineStopInfo = {
      id, lineId, lineCode, lineName,
      lineColor: '#000', lineTextColor: '#fff',
      transportType, stationId, stationName, position,
      lat: 48.8 + position * 0.01, lng: 2.3 + position * 0.01,
    };
    lineStopInfo.set(id, info);

    const existing = stationToLineStops.get(stationId) ?? [];
    existing.push(id);
    stationToLineStops.set(stationId, existing);
  }

  // Line A stops
  addStop('ls-a1', 'lineA', 'M1', 'Ligne 1', 'metro', 'S1', 'Station 1', 0);
  addStop('ls-a2', 'lineA', 'M1', 'Ligne 1', 'metro', 'S2', 'Station 2', 1);
  addStop('ls-a3', 'lineA', 'M1', 'Ligne 1', 'metro', 'S3', 'Station 3', 2);

  // Line B stops
  addStop('ls-b3', 'lineB', 'RER-A', 'RER A', 'rer', 'S3', 'Station 3', 0);
  addStop('ls-b4', 'lineB', 'RER-A', 'RER A', 'rer', 'S4', 'Station 4', 1);
  addStop('ls-b5', 'lineB', 'RER-A', 'RER A', 'rer', 'S5', 'Station 5', 2);

  // Line C stops (isolated)
  addStop('ls-c6', 'lineC', 'T1', 'Tram 1', 'tram', 'S6', 'Station 6', 0);
  addStop('ls-c7', 'lineC', 'T1', 'Tram 1', 'tram', 'S7', 'Station 7', 1);

  // Line A edges (bidirectional)
  adjacency.set('ls-a1', [{ toLineStopId: 'ls-a2', weight: 60, type: 'travel' }]);
  adjacency.set('ls-a2', [
    { toLineStopId: 'ls-a1', weight: 60, type: 'travel' },
    { toLineStopId: 'ls-a3', weight: 90, type: 'travel' },
  ]);
  adjacency.set('ls-a3', [
    { toLineStopId: 'ls-a2', weight: 90, type: 'travel' },
    { toLineStopId: 'ls-b3', weight: 180, type: 'transfer' }, // transfer to Line B
  ]);

  // Line B edges (bidirectional)
  adjacency.set('ls-b3', [
    { toLineStopId: 'ls-b4', weight: 120, type: 'travel' },
    { toLineStopId: 'ls-a3', weight: 180, type: 'transfer' }, // transfer to Line A
  ]);
  adjacency.set('ls-b4', [
    { toLineStopId: 'ls-b3', weight: 120, type: 'travel' },
    { toLineStopId: 'ls-b5', weight: 60, type: 'travel' },
  ]);
  adjacency.set('ls-b5', [{ toLineStopId: 'ls-b4', weight: 60, type: 'travel' }]);

  // Line C edges (isolated)
  adjacency.set('ls-c6', [{ toLineStopId: 'ls-c7', weight: 60, type: 'travel' }]);
  adjacency.set('ls-c7', [{ toLineStopId: 'ls-c6', weight: 60, type: 'travel' }]);

  // Termini
  lineTermini.set('lineA', { first: 'Station 1', last: 'Station 3' });
  lineTermini.set('lineB', { first: 'Station 3', last: 'Station 5' });
  lineTermini.set('lineC', { first: 'Station 6', last: 'Station 7' });

  return { adjacency, stationToLineStops, lineStopInfo, lineTermini, branchTermini };
}

describe('pathfinder', () => {
  let findRoute: typeof import('../pathfinder').findRoute;
  let findRoutes: typeof import('../pathfinder').findRoutes;

  beforeEach(async () => {
    vi.resetModules();
    vi.restoreAllMocks();

    // Re-apply mocks after module reset
    vi.doMock('../graph', () => ({
      getGraph: vi.fn().mockResolvedValue(buildTestGraph()),
    }));
    vi.doMock('../headways', () => ({
      getBoardingPenalty: vi.fn().mockReturnValue(0),
    }));

    const mod = await import('../pathfinder');
    findRoute = mod.findRoute;
    findRoutes = mod.findRoutes;
  });

  describe('findRoute', () => {
    it('finds a direct route on the same line', async () => {
      const result = await findRoute('S1', 'S3');
      expect(result.found).toBe(true);
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].lineCode).toBe('M1');
      expect(result.segments[0].stops).toHaveLength(3); // S1, S2, S3
      expect(result.totalDurationSeconds).toBe(150); // 60 + 90
      expect(result.totalTransfers).toBe(0);
    });

    it('finds a route with transfer', async () => {
      const result = await findRoute('S1', 'S5');
      expect(result.found).toBe(true);
      expect(result.segments).toHaveLength(2);
      expect(result.segments[0].lineCode).toBe('M1');
      expect(result.segments[1].lineCode).toBe('RER-A');
      expect(result.totalTransfers).toBe(1);
      expect(result.transfers).toHaveLength(1);
      expect(result.transfers[0].walkingTimeSeconds).toBe(180);
      // Duration: 60 + 90 (line A) + 180 (transfer) + 120 + 60 (line B) = 510
      expect(result.totalDurationSeconds).toBe(510);
    });

    it('returns not found for unknown station', async () => {
      const result = await findRoute('S1', 'UNKNOWN');
      expect(result.found).toBe(false);
      expect(result.segments).toHaveLength(0);
      expect(result.totalDurationSeconds).toBe(0);
    });

    it('returns not found for unreachable station (isolated line)', async () => {
      const result = await findRoute('S1', 'S6');
      expect(result.found).toBe(false);
    });

    it('finds route in reverse direction', async () => {
      const result = await findRoute('S3', 'S1');
      expect(result.found).toBe(true);
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].lineCode).toBe('M1');
      expect(result.totalDurationSeconds).toBe(150);
    });

    it('finds a route on the isolated line', async () => {
      const result = await findRoute('S6', 'S7');
      expect(result.found).toBe(true);
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].lineCode).toBe('T1');
    });

    describe('excludeLines', () => {
      it('excludes a line from routing', async () => {
        // S1 to S3: normally uses M1, but if M1 is excluded → no route
        const result = await findRoute('S1', 'S3', { excludeLines: new Set(['M1']) });
        expect(result.found).toBe(false);
      });

      it('finds alternative when middle line is excluded', async () => {
        // S3 to S5: normally uses RER-A via ls-b3.
        // If RER-A excluded → no route (no other path to S5)
        const result = await findRoute('S3', 'S5', { excludeLines: new Set(['RER-A']) });
        expect(result.found).toBe(false);
      });
    });

    describe('route structure', () => {
      it('includes correct segment details', async () => {
        const result = await findRoute('S1', 'S3');
        const seg = result.segments[0];
        expect(seg.lineName).toBe('Ligne 1');
        expect(seg.transportType).toBe('metro');
        expect(seg.durationSeconds).toBe(150);
        expect(seg.stops[0].stationName).toBe('Station 1');
        expect(seg.stops[2].stationName).toBe('Station 3');
      });

      it('includes correct transfer details', async () => {
        const result = await findRoute('S1', 'S5');
        const transfer = result.transfers[0];
        expect(transfer.fromLineCode).toBe('M1');
        expect(transfer.toLineCode).toBe('RER-A');
        expect(transfer.stationName).toBe('Station 3');
        expect(transfer.walkingTimeSeconds).toBe(180);
      });

      it('counts total stations correctly', async () => {
        const result = await findRoute('S1', 'S5');
        // Line A: S1, S2, S3 (3 stops) + Line B: S3, S4, S5 (3 stops) = 6
        expect(result.totalStations).toBe(6);
      });
    });
  });

  describe('findRoutes (multi-route)', () => {
    it('returns found: false when no route exists', async () => {
      const result = await findRoutes('S1', 'S6');
      expect(result.found).toBe(false);
      expect(result.routes).toHaveLength(0);
    });

    it('returns at least one route when path exists', async () => {
      const result = await findRoutes('S1', 'S5');
      expect(result.found).toBe(true);
      expect(result.routes.length).toBeGreaterThanOrEqual(1);
    });

    it('labels first route as Fastest', async () => {
      const result = await findRoutes('S1', 'S5');
      expect(result.routes[0].label).toBe('Fastest');
    });

    it('sorts routes by duration (fastest first)', async () => {
      const result = await findRoutes('S1', 'S5');
      for (let i = 1; i < result.routes.length; i++) {
        expect(result.routes[i].route.totalDurationSeconds)
          .toBeGreaterThanOrEqual(result.routes[i - 1].route.totalDurationSeconds);
      }
    });
  });
});
