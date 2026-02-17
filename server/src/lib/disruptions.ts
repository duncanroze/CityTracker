/**
 * Fetches line disruption status from PRIM general-message API.
 * Classifies disruptions into severity levels based on message content.
 */

import { idfmLineMapping } from "../../prisma/data/idfm-mapping.js";
import { env } from "../env.js";

const PRIM_API_KEY = env.PRIM_API_KEY;
const PRIM_BASE_URL = "https://prim.iledefrance-mobilites.fr/marketplace";
const CACHE_TTL_MS = 60_000; // 1 minute

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

interface SiriInfoMessage {
  InfoChannelRef?: { value?: string };
  ValidUntilTime?: string;
  Content?: {
    LineRef?: Array<{ value?: string }>;
    Message?: Array<{
      MessageType?: string;
      MessageText?: { value?: string; lang?: string };
    }>;
  };
}

interface SiriGeneralMessageResponse {
  Siri?: {
    ServiceDelivery?: {
      GeneralMessageDelivery?: Array<{
        InfoMessage?: SiriInfoMessage[];
      }>;
    };
  };
}

function classifySeverity(message: string): DisruptionSeverity {
  const lower = message.toLowerCase();

  // Current interruptions (highest severity)
  if (
    /trafic est interrompu/.test(lower) ||
    /le trafic est actuellement interrompu/.test(lower)
  ) {
    return "interrupted";
  }

  // Current disruptions
  if (
    /trafic est perturbé/.test(lower) ||
    /trafic est actuellement perturbé/.test(lower)
  ) {
    return "disrupted";
  }

  // Future/planned — only flag if happening today
  if (/sera interrompu/.test(lower) || /sera perturbé/.test(lower)) {
    return "disrupted";
  }

  // Default for any "Perturbation" channel message
  return "disrupted";
}

function getShortMessage(messages: SiriInfoMessage["Content"]["Message"]): string | null {
  if (!messages) return null;
  const short = messages.find((m) => m.MessageType === "SHORT_MESSAGE");
  return short?.MessageText?.value ?? messages[0]?.MessageText?.value ?? null;
}

async function fetchLineDisruptions(lineCode: string, idfmId: string): Promise<LineDisruption> {
  const lineRef = `STIF:Line::${idfmId}:`;
  const url = `${PRIM_BASE_URL}/general-message?LineRef=${encodeURIComponent(lineRef)}`;

  try {
    const res = await fetch(url, {
      headers: { apikey: PRIM_API_KEY },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return { lineCode, severity: "ok", message: null };
    }

    const json = (await res.json()) as SiriGeneralMessageResponse;
    const msgs =
      json.Siri?.ServiceDelivery?.GeneralMessageDelivery?.[0]?.InfoMessage ?? [];

    // Filter to "Perturbation" channel only, and still valid
    const now = new Date();
    const active = msgs.filter((m) => {
      if (m.InfoChannelRef?.value !== "Perturbation") return false;
      if (m.ValidUntilTime && new Date(m.ValidUntilTime) < now) return false;
      return true;
    });

    if (active.length === 0) {
      return { lineCode, severity: "ok", message: null };
    }

    // Pick highest severity from all active messages
    let worstSeverity: DisruptionSeverity = "ok";
    let worstMessage: string | null = null;

    for (const msg of active) {
      const text = getShortMessage(msg.Content?.Message) ?? "";
      const severity = classifySeverity(text);
      if (
        severity === "interrupted" ||
        (severity === "disrupted" && worstSeverity === "ok")
      ) {
        worstSeverity = severity;
        worstMessage = text;
      }
    }

    return { lineCode, severity: worstSeverity, message: worstMessage };
  } catch (err) {
    console.warn(`Failed to fetch disruptions for line ${lineCode}:`, (err as Error).message);
    return { lineCode, severity: "ok", message: null };
  }
}

export async function getDisruptions(): Promise<Map<string, LineDisruption>> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  if (!PRIM_API_KEY) {
    return new Map();
  }

  // Fetch all lines in parallel
  const entries = Object.entries(idfmLineMapping);
  const results = await Promise.all(
    entries.map(([code, idfmId]) => fetchLineDisruptions(code, idfmId)),
  );

  const map = new Map<string, LineDisruption>();
  for (const r of results) {
    map.set(r.lineCode, r);
  }

  cached = { data: map, expiresAt: Date.now() + CACHE_TTL_MS };
  return map;
}
