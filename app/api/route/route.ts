import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findRoutes, type RouteStrategy } from '@/lib/server/pathfinder';
import { enrichRouteWithDepartures } from '@/lib/server/departures';
import { findNearestStation } from '@/lib/server/geo';
import { getWalkingDirections, getCyclingDirections } from '@/lib/server/walking';
import { prisma } from '@/lib/server/prisma';
import type { WalkingLeg, WalkingDirect, RouteResult, DirectEstimate } from '@/types';

const querySchema = z
  .object({
    // Station-based origin
    from: z.string().min(1).optional(),
    // Coordinate-based origin
    fromLat: z.coerce.number().optional(),
    fromLng: z.coerce.number().optional(),
    fromAddress: z.string().optional(),
    // Station-based destination
    to: z.string().min(1).optional(),
    // Coordinate-based destination
    toLat: z.coerce.number().optional(),
    toLng: z.coerce.number().optional(),
    toAddress: z.string().optional(),
  })
  .refine(
    (d) => d.from || (d.fromLat != null && d.fromLng != null),
    { message: 'Origin: provide "from" station ID or "fromLat"+"fromLng"' },
  )
  .refine(
    (d) => d.to || (d.toLat != null && d.toLng != null),
    { message: 'Destination: provide "to" station ID or "toLat"+"toLng"' },
  );

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const parsed = querySchema.safeParse({
      from: searchParams.get('from') ?? undefined,
      fromLat: searchParams.get('fromLat') ?? undefined,
      fromLng: searchParams.get('fromLng') ?? undefined,
      fromAddress: searchParams.get('fromAddress') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      toLat: searchParams.get('toLat') ?? undefined,
      toLng: searchParams.get('toLng') ?? undefined,
      toAddress: searchParams.get('toAddress') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Resolve origin
    let fromStationId: string;
    let walkingFrom: WalkingLeg | undefined;

    if (data.from) {
      fromStationId = data.from;
    } else {
      const nearest = await findNearestStation(data.fromLat!, data.fromLng!);
      if (!nearest) {
        return NextResponse.json(
          { error: 'No station found near the origin address' },
          { status: 400 },
        );
      }
      fromStationId = nearest.id;
      walkingFrom = {
        address: data.fromAddress ?? 'Adresse de départ',
        lat: data.fromLat!,
        lng: data.fromLng!,
        stationName: nearest.name,
        stationId: nearest.id,
        stationLat: nearest.lat,
        stationLng: nearest.lng,
        durationSeconds: nearest.durationSeconds,
        distanceMeters: nearest.distanceMeters,
      };
    }

    // Resolve destination
    let toStationId: string;
    let walkingTo: WalkingLeg | undefined;

    if (data.to) {
      toStationId = data.to;
    } else {
      const nearest = await findNearestStation(data.toLat!, data.toLng!);
      if (!nearest) {
        return NextResponse.json(
          { error: 'No station found near the destination address' },
          { status: 400 },
        );
      }
      toStationId = nearest.id;
      walkingTo = {
        address: data.toAddress ?? "Adresse d'arrivée",
        lat: data.toLat!,
        lng: data.toLng!,
        stationName: nearest.name,
        stationId: nearest.id,
        stationLat: nearest.lat,
        stationLng: nearest.lng,
        durationSeconds: nearest.durationSeconds,
        distanceMeters: nearest.distanceMeters,
      };
    }

    if (fromStationId === toStationId) {
      // Build a walking-only route between the two points via OSRM
      const fromLat = data.fromLat ?? walkingFrom?.stationLat ?? 0;
      const fromLng = data.fromLng ?? walkingFrom?.stationLng ?? 0;
      const toLat = data.toLat ?? walkingTo?.stationLat ?? 0;
      const toLng = data.toLng ?? walkingTo?.stationLng ?? 0;
      const fromAddr = data.fromAddress ?? walkingFrom?.stationName ?? 'Départ';
      const toAddr = data.toAddress ?? walkingTo?.stationName ?? 'Arrivée';

      const directions = await getWalkingDirections(fromLat, fromLng, toLat, toLng);

      const walkingDirect: WalkingDirect = {
        fromAddress: fromAddr,
        fromLat,
        fromLng,
        toAddress: toAddr,
        toLat,
        toLng,
        distanceMeters: directions.distanceMeters,
        durationSeconds: directions.durationSeconds,
        path: directions.path,
      };

      const walkingRoute: RouteResult = {
        found: true,
        walkingOnly: true,
        walkingDirect,
        totalDurationSeconds: directions.durationSeconds,
        totalStations: 0,
        totalTransfers: 0,
        segments: [],
        transfers: [],
      };

      return NextResponse.json({
        found: true,
        routes: [{ label: 'Walking', route: walkingRoute }],
      });
    }

    const validStrategies: RouteStrategy[] = ['fastest', 'fewest_transfers', 'least_walking'];
    const rawStrategy = searchParams.get('strategy') ?? 'fastest';
    const strategy: RouteStrategy = validStrategies.includes(rawStrategy as RouteStrategy)
      ? (rawStrategy as RouteStrategy)
      : 'fastest';
    const result = await findRoutes(fromStationId, toStationId, strategy);

    // Enrich routes with real-time departures + walking legs
    const enrichedRoutes = await Promise.all(
      result.routes.map(async (labeled) => {
        let route: RouteResult;
        try {
          route = await enrichRouteWithDepartures(labeled.route);
        } catch (err) {
          console.warn('Failed to enrich route:', (err as Error).message);
          route = labeled.route;
        }

        // Attach walking legs with OSRM street-level paths
        if (walkingFrom) {
          const wfDir = await getWalkingDirections(
            walkingFrom.lat, walkingFrom.lng,
            walkingFrom.stationLat, walkingFrom.stationLng,
          );
          const enrichedWalkFrom = {
            ...walkingFrom,
            path: wfDir.path,
            distanceMeters: wfDir.distanceMeters,
            durationSeconds: wfDir.durationSeconds,
          };
          route = { ...route, walkingFrom: enrichedWalkFrom };
          route.totalDurationSeconds += enrichedWalkFrom.durationSeconds;
        }
        if (walkingTo) {
          const wtDir = await getWalkingDirections(
            walkingTo.stationLat, walkingTo.stationLng,
            walkingTo.lat, walkingTo.lng,
          );
          const enrichedWalkTo = {
            ...walkingTo,
            path: wtDir.path,
            distanceMeters: wtDir.distanceMeters,
            durationSeconds: wtDir.durationSeconds,
          };
          route = { ...route, walkingTo: enrichedWalkTo };
          route.totalDurationSeconds += enrichedWalkTo.durationSeconds;
        }

        return { ...labeled, route };
      }),
    );

    // Re-sort based on strategy after enrichment
    const totalWalk = (r: RouteResult) =>
      (r.walkingFrom?.durationSeconds ?? 0) + (r.walkingTo?.durationSeconds ?? 0)
      + r.transfers.reduce((sum, t) => sum + t.walkingTimeSeconds, 0);

    if (strategy === 'fewest_transfers') {
      enrichedRoutes.sort((a, b) =>
        a.route.totalTransfers - b.route.totalTransfers || a.route.totalDurationSeconds - b.route.totalDurationSeconds,
      );
    } else if (strategy === 'least_walking') {
      enrichedRoutes.sort((a, b) =>
        totalWalk(a.route) - totalWalk(b.route) || a.route.totalDurationSeconds - b.route.totalDurationSeconds,
      );
    } else {
      enrichedRoutes.sort((a, b) => a.route.totalDurationSeconds - b.route.totalDurationSeconds);
    }
    enrichedRoutes.forEach((r, i) => {
      r.label = i === 0 ? 'Fastest' : `Option ${i + 1}`;
    });

    // Compute direct walking & cycling estimates (skip on strategy-change requests)
    let walkingEstimate: DirectEstimate | undefined;
    let cyclingEstimate: DirectEstimate | undefined;
    const skipEstimates = searchParams.get('skipEstimates') === '1';

    if (!skipEstimates) {
      let originLat = data.fromLat;
      let originLng = data.fromLng;
      let destLat = data.toLat;
      let destLng = data.toLng;

      if (originLat == null && data.from) {
        const s = await prisma.station.findUnique({ where: { id: data.from }, select: { latitude: true, longitude: true } });
        if (s) { originLat = s.latitude; originLng = s.longitude; }
      }
      if (destLat == null && data.to) {
        const s = await prisma.station.findUnique({ where: { id: data.to }, select: { latitude: true, longitude: true } });
        if (s) { destLat = s.latitude; destLng = s.longitude; }
      }

      if (originLat != null && originLng != null && destLat != null && destLng != null) {
        const [walkDir, bikeDir] = await Promise.all([
          getWalkingDirections(originLat, originLng, destLat, destLng),
          getCyclingDirections(originLat, originLng, destLat, destLng),
        ]);
        walkingEstimate = { durationSeconds: walkDir.durationSeconds, distanceMeters: walkDir.distanceMeters, path: walkDir.path };
        cyclingEstimate = { durationSeconds: bikeDir.durationSeconds, distanceMeters: bikeDir.distanceMeters, path: bikeDir.path };
      }
    }

    return NextResponse.json({ ...result, routes: enrichedRoutes, walkingEstimate, cyclingEstimate });
  } catch (err) {
    console.error('Error finding route:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
