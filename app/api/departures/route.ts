import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { getNextDepartures } from '@/lib/server/prim';

const querySchema = z.object({
  lineStopId: z.string().min(1, 'lineStopId is required'),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const parsed = querySchema.safeParse({
      lineStopId: searchParams.get('lineStopId'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { lineStopId } = parsed.data;

    // Look up the IDFM stop mapping
    const mapping = await prisma.idfmStopMapping.findUnique({
      where: { lineStopId },
      include: {
        lineStop: {
          include: { line: true },
        },
      },
    });

    if (!mapping) {
      return NextResponse.json(
        { error: 'No IDFM mapping found for this stop' },
        { status: 404 },
      );
    }

    const allDepartures = await getNextDepartures(mapping.idfmStopId, mapping.isStopArea);

    // Filter by the line's IDFM reference if available
    const idfmLineId = mapping.lineStop.line.idfmId;
    const departures = idfmLineId
      ? allDepartures.filter((d) => d.lineRef.includes(idfmLineId))
      : allDepartures;

    return NextResponse.json({
      departures: departures.map((d) => ({
        destination: d.destination,
        expectedTime: d.expectedDeparture,
      })),
    });
  } catch (err) {
    console.error('Error fetching departures:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
