import { PrismaClient } from "@prisma/client";
import {
  lines,
  stations,
  lineStopSequences,
  connectionPairs,
} from "./data/paris-transport.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Paris transport data…");

  await prisma.$transaction(
    async (tx) => {
      // ── 1. Delete in reverse FK order ──────────────────────────────
      const delConn = await tx.connection.deleteMany();
      const delMapping = await tx.idfmStopMapping.deleteMany();
      const delStop = await tx.lineStop.deleteMany();
      const delSta = await tx.station.deleteMany();
      const delLine = await tx.line.deleteMany();
      console.log(
        `  Cleared: ${delLine.count} lines, ${delSta.count} stations, ${delStop.count} stops, ${delConn.count} connections, ${delMapping.count} mappings`,
      );

      // ── 2. Create Lines ────────────────────────────────────────────
      const lineMap = new Map<string, string>(); // code → id
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
      console.log(`  Lines:       ${lineMap.size}`);

      // ── 3. Create Stations ─────────────────────────────────────────
      const stationMap = new Map<string, string>(); // slug → id
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
      console.log(`  Stations:    ${stationMap.size}`);

      // ── 4. Create LineStops ────────────────────────────────────────
      // Lines with branches have multiple stop sequences.
      // Track the next position per line to ensure unique positions.
      const lineStopMap = new Map<string, string>(); // "code:slug" → id
      const linePositionCounter = new Map<string, number>(); // lineCode → next position
      let totalStops = 0;

      for (const seq of lineStopSequences) {
        const lineId = lineMap.get(seq.lineCode);
        if (!lineId) throw new Error(`Unknown line code: ${seq.lineCode}`);

        let pos = linePositionCounter.get(seq.lineCode) ?? 0;

        for (let i = 0; i < seq.stops.length; i++) {
          const stop = seq.stops[i];
          const stationId = stationMap.get(stop.stationSlug);
          if (!stationId)
            throw new Error(
              `Unknown station slug: ${stop.stationSlug} (line ${seq.lineCode})`,
            );

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
      console.log(`  LineStops:   ${totalStops}`);

      // ── 5. Create Connections (bidirectional, batched) ─────────────
      const connectionData: { fromLineStopId: string; toLineStopId: string; walkingTime: number }[] = [];

      for (const pair of connectionPairs) {
        const fromKey = `${pair.lineCodeA}:${pair.stationSlugA}`;
        const toKey = `${pair.lineCodeB}:${pair.stationSlugB}`;
        const fromId = lineStopMap.get(fromKey);
        const toId = lineStopMap.get(toKey);

        if (!fromId)
          throw new Error(`Unknown line-stop key: ${fromKey}`);
        if (!toId)
          throw new Error(`Unknown line-stop key: ${toKey}`);

        // A → B
        connectionData.push({
          fromLineStopId: fromId,
          toLineStopId: toId,
          walkingTime: pair.walkingTime,
        });
        // B → A
        connectionData.push({
          fromLineStopId: toId,
          toLineStopId: fromId,
          walkingTime: pair.walkingTime,
        });
      }

      const { count: totalConns } = await tx.connection.createMany({
        data: connectionData,
      });
      console.log(`  Connections: ${totalConns}`);
    },
    { timeout: 120_000 },
  );

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
