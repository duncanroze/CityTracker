/**
 * PRIM (IDFM) real-time API client.
 * Uses SIRI Lite stop-monitoring to get next departures at a stop.
 */

import { env } from "../env.js";

const PRIM_API_KEY = env.PRIM_API_KEY;
const PRIM_BASE_URL = "https://prim.iledefrance-mobilites.fr/marketplace";

const CACHE_TTL_MS = 30_000; // 30 seconds

interface CacheEntry {
  data: Departure[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export interface Departure {
  lineRef: string;
  destination: string;
  expectedDeparture: string; // ISO 8601
}

interface SiriMonitoredCall {
  ExpectedDepartureTime?: string;
  AimedDepartureTime?: string;
}

interface SiriMonitoredVehicleJourney {
  LineRef?: { value?: string };
  DestinationName?: Array<{ value?: string }>;
  MonitoredCall?: SiriMonitoredCall;
}

interface SiriMonitoredStopVisit {
  MonitoredVehicleJourney?: SiriMonitoredVehicleJourney;
}

interface SiriDelivery {
  MonitoredStopVisit?: SiriMonitoredStopVisit[];
}

interface SiriResponse {
  Siri?: {
    ServiceDelivery?: {
      StopMonitoringDelivery?: SiriDelivery[];
    };
  };
}

/**
 * Fetch next departures for an IDFM stop ID.
 * @param idfmStopId Numeric IDFM stop ID (e.g. "22087")
 * @param isStopArea If true, uses StopArea:SP format (RER); otherwise StopPoint:Q (Metro/Tram)
 */
export async function getNextDepartures(idfmStopId: string, isStopArea = false): Promise<Departure[]> {
  const cacheKey = `${isStopArea ? "SA" : "SP"}:${idfmStopId}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  if (!PRIM_API_KEY) {
    console.warn("PRIM_API_KEY not set, skipping real-time departures");
    return [];
  }

  const monitoringRef = isStopArea
    ? `STIF:StopArea:SP:${idfmStopId}:`
    : `STIF:StopPoint:Q:${idfmStopId}:`;
  const url = `${PRIM_BASE_URL}/stop-monitoring?MonitoringRef=${encodeURIComponent(monitoringRef)}`;

  try {
    const res = await fetch(url, {
      headers: { apikey: PRIM_API_KEY },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`PRIM API error: ${res.status} for stop ${idfmStopId}`);
      return [];
    }

    const json = (await res.json()) as SiriResponse;
    const departures = parseSiriResponse(json);

    // Cache the result
    cache.set(cacheKey, {
      data: departures,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return departures;
  } catch (err) {
    console.warn(`PRIM fetch error for stop ${idfmStopId}:`, (err as Error).message);
    return [];
  }
}

function parseSiriResponse(json: SiriResponse): Departure[] {
  const deliveries = json.Siri?.ServiceDelivery?.StopMonitoringDelivery;
  if (!deliveries) return [];

  const departures: Departure[] = [];

  for (const delivery of deliveries) {
    const visits = delivery.MonitoredStopVisit;
    if (!visits) continue;

    for (const visit of visits) {
      const journey = visit.MonitoredVehicleJourney;
      if (!journey) continue;

      const lineRef = journey.LineRef?.value ?? "";
      const destination = journey.DestinationName?.[0]?.value ?? "";
      const expectedDeparture =
        journey.MonitoredCall?.ExpectedDepartureTime ??
        journey.MonitoredCall?.AimedDepartureTime ??
        "";

      if (expectedDeparture) {
        departures.push({ lineRef, destination, expectedDeparture });
      }
    }
  }

  // Sort by departure time
  departures.sort((a, b) => a.expectedDeparture.localeCompare(b.expectedDeparture));

  return departures;
}
