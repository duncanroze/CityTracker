import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';

export async function GET() {
  try {
    const lines = await prisma.line.findMany({
      orderBy: { code: 'asc' },
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
                isAccessible: true,
              },
            },
          },
        },
      },
    });

    const result = lines.map((l) => ({
      id: l.id,
      code: l.code,
      name: l.name,
      transportType: l.transportType,
      color: l.color,
      textColor: l.textColor,
      stations: l.lineStops.map((ls) => ({
        id: ls.station.id,
        name: ls.station.name,
        slug: ls.station.slug,
        latitude: ls.station.latitude,
        longitude: ls.station.longitude,
        position: ls.position,
        isAccessible: ls.station.isAccessible,
      })),
    }));

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (err) {
    console.error('Error fetching lines:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
