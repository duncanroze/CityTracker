import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import {
  lines,
  stations,
  lineStopSequences,
  connectionPairs,
} from '@/prisma/data/paris-transport';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  // Simple token protection — set SEED_SECRET in Vercel env vars
  const authHeader = request.headers.get('authorization');
  const secret = process.env.SEED_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        // 1. Delete in reverse FK order
        await tx.connection.deleteMany();
        await tx.idfmStopMapping.deleteMany();
        await tx.lineStop.deleteMany();
        await tx.station.deleteMany();
        await tx.line.deleteMany();

        // 2. Create Lines
        const lineMap = new Map<string, string>();
        for (const l of lines) {
          const created = await tx.line.create({
            data: {
              code: l.code,
              name: l.name,
              transportType: l.transportType,
              color: l.color,
              textColor: l.textColor,
            },
          });
          lineMap.set(l.code, created.id);
        }

        // 3. Create Stations
        const stationMap = new Map<string, string>();
        for (const s of stations) {
          const created = await tx.station.create({
            data: {
              name: s.name,
              slug: s.slug,
              latitude: s.latitude,
              longitude: s.longitude,
              isAccessible: s.isAccessible,
              municipality: s.municipality ?? null,
            },
          });
          stationMap.set(s.slug, created.id);
        }

        // 4. Create LineStops
        const lineStopMap = new Map<string, string>();
        const linePositionCounter = new Map<string, number>();
        let totalStops = 0;

        for (const seq of lineStopSequences) {
          const lineId = lineMap.get(seq.lineCode);
          if (!lineId) throw new Error(`Unknown line code: ${seq.lineCode}`);

          let pos = linePositionCounter.get(seq.lineCode) ?? 0;

          for (let i = 0; i < seq.stops.length; i++) {
            const stop = seq.stops[i];
            const stationId = stationMap.get(stop.stationSlug);
            if (!stationId)
              throw new Error(`Unknown station slug: ${stop.stationSlug} (line ${seq.lineCode})`);

            const created = await tx.lineStop.create({
              data: {
                lineId,
                stationId,
                position: pos,
                travelTimeToNext: stop.travelTimeToNext,
              },
            });
            lineStopMap.set(`${seq.lineCode}:${stop.stationSlug}`, created.id);
            totalStops++;
            pos++;
          }

          linePositionCounter.set(seq.lineCode, pos);
        }

        // 5. Create Connections (bidirectional)
        const connectionData: { fromLineStopId: string; toLineStopId: string; walkingTime: number }[] = [];

        for (const pair of connectionPairs) {
          const fromKey = `${pair.lineCodeA}:${pair.stationSlugA}`;
          const toKey = `${pair.lineCodeB}:${pair.stationSlugB}`;
          const fromId = lineStopMap.get(fromKey);
          const toId = lineStopMap.get(toKey);

          if (!fromId) throw new Error(`Unknown line-stop key: ${fromKey}`);
          if (!toId) throw new Error(`Unknown line-stop key: ${toKey}`);

          connectionData.push({ fromLineStopId: fromId, toLineStopId: toId, walkingTime: pair.walkingTime });
          connectionData.push({ fromLineStopId: toId, toLineStopId: fromId, walkingTime: pair.walkingTime });
        }

        await tx.connection.createMany({ data: connectionData });

        return { lines: lineMap.size, stations: stationMap.size, stops: totalStops, connections: connectionData.length };
      },
      { timeout: 120_000 },
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Seed failed:', error);
    return NextResponse.json(
      { error: 'Seed failed', details: (error as Error).message },
      { status: 500 },
    );
  }
}
