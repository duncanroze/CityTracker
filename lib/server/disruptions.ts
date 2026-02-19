/**
 * Fetches line disruption status from PRIM line_reports API (Navitia v2).
 * Uses a single bulk API call to get all disruption data.
 * Cache TTL is 5 minutes to avoid hitting the 1000/day rate limit.
 */

import { idfmLineMapping } from '@/prisma/data/idfm-mapping';
import { env } from './env';

const PRIM_API_KEY = env.PRIM_API_KEY;
const PRIM_LINE_REPORTS_URL =
  "https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/line_reports/line_reports";
const CACHE_TTL_MS = 5 * 60_000; // 5 minutes

export type DisruptionSeverity = "ok" | "disrupted" | "interrupted";

export interface LineDisruption {
  lineCode: string;
  severity: DisruptionSeverity;
  message: string | null;
}

interface CachedDisruptions {
  data: Map<string, LineDisruption>;
  expiresAt: number;
}

let cached: CachedDisruptions | null = null;

// Reverse map: full Navitia line ID → our line code
// e.g. "line:IDFM:C01371" → "M1"
const navitiaIdToLineCode = new Map<string, string>();
for (const [code, idfmId] of Object.entries(idfmLineMapping)) {
  navitiaIdToLineCode.set(`line:IDFM:${idfmId}`, code);
}

interface NavitiaImpactedObject {
  pt_object?: {
    id?: string;
    embedded_type?: string;
  };
}

interface NavitiaDisruption {
  id: string;
  severity?: {
    name?: string;
    effect?: string;
  };
  messages?: Array<{
    text?: string;
  }>;
  application_periods?: Array<{
    begin?: string;
    end?: string;
  }>;
  impacted_objects?: NavitiaImpactedObject[];
}

interface NavitiaLineReportsResponse {
  disruptions?: NavitiaDisruption[];
}

function effectToSeverity(effect: string | undefined): DisruptionSeverity {
  switch (effect) {
    case "NO_SERVICE":
      return "interrupted";
    case "SIGNIFICANT_DELAYS":
    case "REDUCED_SERVICE":
    case "DETOUR":
    case "MODIFIED_SERVICE":
      return "disrupted";
    default:
      return "ok";
  }
}

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

function getShortMessage(disruption: NavitiaDisruption): string | null {
  const msgs = disruption.messages;
  if (!msgs || msgs.length === 0) return null;

  for (const m of msgs) {
    if (m.text) {
      const clean = stripHtml(m.text);
      if (clean.length > 0 && clean.length < 200) return clean;
    }
  }
  if (msgs[0]?.text) {
    return stripHtml(msgs[0].text).slice(0, 150);
  }
  return null;
}

/** Parse Navitia compact date "20260220T194000" → Date */
function parseNavitiaDate(s: string): Date {
  // Format: YYYYMMDDTHHmmss → YYYY-MM-DDTHH:mm:ss
  if (s.length >= 15 && s[8] === "T") {
    const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}`;
    return new Date(iso);
  }
  return new Date(s);
}

function isCurrentlyActive(disruption: NavitiaDisruption): boolean {
  const periods = disruption.application_periods;
  if (!periods || periods.length === 0) return true;

  const now = new Date();
  return periods.some((p) => {
    const begin = p.begin ? parseNavitiaDate(p.begin) : new Date(0);
    const end = p.end ? parseNavitiaDate(p.end) : new Date("2099-01-01");
    return begin <= now && now <= end;
  });
}

async function fetchAllDisruptions(): Promise<Map<string, LineDisruption>> {
  const map = new Map<string, LineDisruption>();

  if (!PRIM_API_KEY) {
    return map;
  }

  try {
    const url = new URL(PRIM_LINE_REPORTS_URL);
    url.searchParams.set("count", "200");
    url.searchParams.append("forbidden_uris[]", "physical_mode:Bus");
    url.searchParams.append("forbidden_uris[]", "physical_mode:Coach");

    const res = await fetch(url.toString(), {
      headers: { apikey: PRIM_API_KEY },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn(`PRIM line_reports returned ${res.status}: ${body.substring(0, 200)}`);
      return map;
    }

    const json = (await res.json()) as NavitiaLineReportsResponse;
    const disruptions = json.disruptions ?? [];

    // Process each disruption: check impacted_objects for lines we track
    for (const disruption of disruptions) {
      if (!isCurrentlyActive(disruption)) continue;

      const severity = effectToSeverity(disruption.severity?.effect);
      if (severity === "ok") continue;

      const impacted = disruption.impacted_objects ?? [];
      for (const obj of impacted) {
        const ptId = obj.pt_object?.id;
        if (!ptId) continue;

        const ourLineCode = navitiaIdToLineCode.get(ptId);
        if (!ourLineCode) continue;

        const existing = map.get(ourLineCode);
        // Upgrade severity: interrupted > disrupted > ok
        if (
          !existing ||
          severity === "interrupted" ||
          (severity === "disrupted" && existing.severity !== "interrupted")
        ) {
          map.set(ourLineCode, {
            lineCode: ourLineCode,
            severity,
            message: getShortMessage(disruption),
          });
        }
      }
    }

    console.log(`[disruptions] ${disruptions.length} disruptions → ${map.size} lines affected`);
    return map;
  } catch (err) {
    console.warn("Failed to fetch disruptions:", (err as Error).message);
    return map;
  }
}

export async function getDisruptions(): Promise<Map<string, LineDisruption>> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const data = await fetchAllDisruptions();
  cached = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}
