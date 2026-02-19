import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findRoutes } from '@/lib/server/pathfinder';
import { enrichRouteWithDepartures } from '@/lib/server/departures';
import { findNearestStation } from '@/lib/server/geo';
import type { WalkingLeg, RouteResult } from '@/types';

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
      return NextResponse.json(
        { error: 'Origin and destination must be different' },
        { status: 400 },
      );
    }

    const result = await findRoutes(fromStationId, toStationId);

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

        // Attach walking legs and adjust total duration
        if (walkingFrom) {
          route = { ...route, walkingFrom };
          route.totalDurationSeconds += walkingFrom.durationSeconds;
        }
        if (walkingTo) {
          route = { ...route, walkingTo };
          route.totalDurationSeconds += walkingTo.durationSeconds;
        }

        return { ...labeled, route };
      }),
    );

    // Re-sort by enriched duration and re-label
    enrichedRoutes.sort((a, b) => a.route.totalDurationSeconds - b.route.totalDurationSeconds);
    enrichedRoutes.forEach((r, i) => {
      r.label = i === 0 ? 'Fastest' : `Option ${i + 1}`;
    });

    return NextResponse.json({ ...result, routes: enrichedRoutes });
  } catch (err) {
    console.error('Error finding route:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
