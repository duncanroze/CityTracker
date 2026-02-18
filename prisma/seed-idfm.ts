/**
 * Seed script: populate IdfmStopMapping by querying the IDFM arrets-lignes API.
 *
 * For each (station, line) in our DB, we query the IDFM open data to find the
 * corresponding IDFM stop ID, then store it in IdfmStopMapping.
 *
 * Metro/Tram stops use stop_id format "IDFM:22087" → MonitoringRef "STIF:StopPoint:Q:22087:"
 * RER stops use stop_id format "IDFM:monomodalStopPlace:470549" → MonitoringRef "STIF:StopArea:SP:470549:"
 *
 * Usage: npx tsx prisma/seed-idfm.ts
 * Requires: PRIM_API_KEY in .env
 */

import { PrismaClient } from "@prisma/client";
import { idfmLineMapping } from "./data/idfm-mapping.js";

const prisma = new PrismaClient();

const PRIM_API_KEY = process.env["PRIM_API_KEY"];
if (!PRIM_API_KEY) {
  console.error("Missing PRIM_API_KEY in .env");
  process.exit(1);
}

const ARRETS_LIGNES_URL =
  "https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/arrets-lignes/records";

/** Normalize station name for fuzzy matching */
function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-'']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface ArretsLignesRecord {
  stop_id: string;
  stop_name: string;
  route_long_name: string;
}

interface StopIdResult {
  idfmStopId: string;
  isStopArea: boolean;
}

/**
 * Parse a stop_id from the arrets-lignes dataset.
 * - "IDFM:22087" → { idfmStopId: "22087", isStopArea: false }
 * - "IDFM:monomodalStopPlace:470549" → { idfmStopId: "470549", isStopArea: true }
 */
function parseStopId(stopId: string): StopIdResult | null {
  const monomodal = stopId.match(/IDFM:monomodalStopPlace:(\d+)/);
  if (monomodal) {
    return { idfmStopId: monomodal[1], isStopArea: true };
  }
  const simple = stopId.match(/^IDFM:(\d+)$/);
  if (simple) {
    return { idfmStopId: simple[1], isStopArea: false };
  }
  return null;
}

async function queryIdfmStop(
  stationName: string,
  lineCode: string,
): Promise<StopIdResult | null> {
  const idfmLineId = idfmLineMapping[lineCode];
  if (!idfmLineId) return null;

  // Try exact name match first
  const result = await queryWithName(stationName, idfmLineId);
  if (result) return result;

  // Fallback: fuzzy search with first significant word
  return await queryFuzzy(stationName, idfmLineId);
}

async function queryWithName(
  stationName: string,
  idfmLineId: string,
): Promise<StopIdResult | null> {
  const where = `stop_name like "${stationName}" and id like "IDFM:${idfmLineId}:"`;
  const params = new URLSearchParams({ where, limit: "5" });
  const url = `${ARRETS_LIGNES_URL}?${params.toString()}`;

  try {
    const res = await fetch(url, { headers: { apikey: PRIM_API_KEY! } });
    if (!res.ok) return null;

    const data = (await res.json()) as { total_count: number; results: ArretsLignesRecord[] };
    if (data.total_count > 0 && data.results[0]) {
      return parseStopId(data.results[0].stop_id);
    }
    return null;
  } catch (err) {
    console.warn(`  API error: ${(err as Error).message}`);
    return null;
  }
}

async function queryFuzzy(
  stationName: string,
  idfmLineId: string,
): Promise<StopIdResult | null> {
  const words = stationName.split(/[\s-]+/).filter((w) => w.length > 2);
  const searchTerm = words[0] ?? stationName;

  const where = `stop_name like "${searchTerm}" and id like "IDFM:${idfmLineId}:"`;
  const params = new URLSearchParams({ where, limit: "10" });
  const url = `${ARRETS_LIGNES_URL}?${params.toString()}`;

  try {
    const res = await fetch(url, { headers: { apikey: PRIM_API_KEY! } });
    if (!res.ok) return null;

    const data = (await res.json()) as { total_count: number; results: ArretsLignesRecord[] };
    if (data.total_count === 0) return null;

    const normalizedTarget = normalize(stationName);
    let bestMatch: ArretsLignesRecord | null = null;
    let bestScore = Infinity;

    for (const record of data.results) {
      const normalizedRecord = normalize(record.stop_name);
      const score =
        Math.abs(normalizedTarget.length - normalizedRecord.length) +
        (normalizedRecord.includes(normalizedTarget) || normalizedTarget.includes(normalizedRecord)
          ? 0
          : 100);
      if (score < bestScore) {
        bestScore = score;
        bestMatch = record;
      }
    }

    if (bestMatch && bestScore < 50) {
      return parseStopId(bestMatch.stop_id);
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  console.log("Seeding IDFM stop mappings…\n");

  // First, update Line.idfmId from our static mapping
  const lines = await prisma.line.findMany();
  for (const line of lines) {
    const idfmId = idfmLineMapping[line.code];
    if (idfmId && line.idfmId !== idfmId) {
      await prisma.line.update({
        where: { id: line.id },
        data: { idfmId },
      });
      console.log(`  Line ${line.code} → IDFM ${idfmId}`);
    }
  }
  console.log(`\nUpdated ${lines.length} lines with IDFM IDs.\n`);

  // Fetch all line stops with their station and line info
  const lineStops = await prisma.lineStop.findMany({
    include: {
      station: true,
      line: true,
      idfmMapping: true,
    },
  });

  let mapped = 0;
  let skipped = 0;
  let failed = 0;

  for (const ls of lineStops) {
    // Skip if already mapped
    if (ls.idfmMapping) {
      skipped++;
      continue;
    }

    const result = await queryIdfmStop(ls.station.name, ls.line.code);

    if (result) {
      await prisma.idfmStopMapping.create({
        data: {
          lineStopId: ls.id,
          idfmStopId: result.idfmStopId,
          isStopArea: result.isStopArea,
        },
      });
      mapped++;
      const tag = result.isStopArea ? "StopArea" : "StopPoint";
      console.log(`  ✓ ${ls.station.name} (${ls.line.code}) → ${result.idfmStopId} [${tag}]`);
    } else {
      failed++;
      console.log(`  ✗ ${ls.station.name} (${ls.line.code}) — not found`);
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\nDone! Mapped: ${mapped}, Skipped: ${skipped}, Failed: ${failed}`);
  console.log(`Coverage: ${Math.round(((mapped + skipped) / lineStops.length) * 100)}%`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
