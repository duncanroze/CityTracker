import { prisma } from './prisma';

/** Haversine distance between two points in meters */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const WALKING_SPEED_M_PER_MIN = 80; // ~5 km/h

export interface NearestStationResult {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  durationSeconds: number;
}

/**
 * Find the nearest station to a given lat/lng.
 * Returns null if no station is within the given radius (default 1500m).
 */
export async function findNearestStation(
  lat: number,
  lng: number,
  radiusMeters = 1500,
): Promise<NearestStationResult | null> {
  const stations = await prisma.station.findMany({
    select: { id: true, name: true, latitude: true, longitude: true },
  });

  let best: NearestStationResult | null = null;

  for (const s of stations) {
    const d = haversineMeters(lat, lng, s.latitude, s.longitude);
    if (d <= radiusMeters && (!best || d < best.distanceMeters)) {
      best = {
        id: s.id,
        name: s.name,
        lat: s.latitude,
        lng: s.longitude,
        distanceMeters: Math.round(d),
        durationSeconds: Math.round((d / WALKING_SPEED_M_PER_MIN) * 60),
      };
    }
  }

  return best;
}
