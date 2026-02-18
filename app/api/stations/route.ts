import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';

export async function GET() {
  try {
    const stations = await prisma.station.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        lineStops: {
          select: {
            line: {
              select: {
                code: true,
                color: true,
                textColor: true,
                transportType: true,
              },
            },
          },
        },
      },
    });

    const result = stations.map((s) => ({
      id: s.id,
      name: s.name,
      lines: s.lineStops.map((ls) => ({
        code: ls.line.code,
        color: ls.line.color,
        textColor: ls.line.textColor,
        transportType: ls.line.transportType,
      })),
    }));

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (err) {
    console.error('Error fetching stations:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
