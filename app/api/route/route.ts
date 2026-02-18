import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findRoutes } from '@/lib/server/pathfinder';
import { enrichRouteWithDepartures } from '@/lib/server/departures';

const querySchema = z.object({
  from: z.string().min(1, 'from is required'),
  to: z.string().min(1, 'to is required'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const parsed = querySchema.safeParse({
      from: searchParams.get('from'),
      to: searchParams.get('to'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { from, to } = parsed.data;

    if (from === to) {
      return NextResponse.json(
        { error: 'Origin and destination must be different' },
        { status: 400 },
      );
    }

    const result = await findRoutes(from, to);

    // Enrich routes with real-time departure data — individual failures fall back to un-enriched route
    const enrichedRoutes = await Promise.all(
      result.routes.map(async (labeled) => {
        try {
          return {
            ...labeled,
            route: await enrichRouteWithDepartures(labeled.route),
          };
        } catch (err) {
          console.warn('Failed to enrich route:', (err as Error).message);
          return labeled;
        }
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
