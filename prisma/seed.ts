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
      const delStop = await tx.lineStop.deleteMany();
      const delSta = await tx.station.deleteMany();
      const delLine = await tx.line.deleteMany();
      console.log(
        `  Cleared: ${delLine.count} lines, ${delSta.count} stations, ${delStop.count} stops, ${delConn.count} connections`,
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
      const lineStopMap = new Map<string, string>(); // "code:slug" → id
      let totalStops = 0;

      for (const seq of lineStopSequences) {
        const lineId = lineMap.get(seq.lineCode);
        if (!lineId) throw new Error(`Unknown line code: ${seq.lineCode}`);

        const offset = seq.positionOffset ?? 0;
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
              position: offset + i,
              travelTimeToNext: stop.travelTimeToNext,
            },
          });
          // For connection lookup: first entry per line:station wins
          const key = `${seq.lineCode}:${stop.stationSlug}`;
          if (!lineStopMap.has(key)) {
            lineStopMap.set(key, created.id);
          }
          totalStops++;
        }
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
