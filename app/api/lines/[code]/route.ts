import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    const line = await prisma.line.findFirst({
      where: { code },
      include: {
        lineStops: {
          orderBy: { position: 'asc' },
          include: {
            station: {
              select: {
                id: true,
                name: true,
                slug: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
      },
    });

    if (!line) {
      return NextResponse.json({ error: 'Line not found' }, { status: 404 });
    }

    const result = {
      id: line.id,
      code: line.code,
      name: line.name,
      transportType: line.transportType,
      color: line.color,
      textColor: line.textColor,
      stations: line.lineStops.map((ls) => ({
        id: ls.station.id,
        name: ls.station.name,
        slug: ls.station.slug,
        latitude: ls.station.latitude,
        longitude: ls.station.longitude,
        position: ls.position,
      })),
    };

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (err) {
    console.error('Error fetching line:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
