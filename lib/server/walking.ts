/**
 * Walking & cycling directions via OSRM (Open Source Routing Machine).
 * Uses the public demo server — no API key required.
 * Returns street-level path geometry + accurate distance/duration.
 */

// FOSSGIS OSRM servers — dedicated instances per profile (foot, bike, car)
// The public OSRM demo (router.project-osrm.org) only supports 'car' in practice,
// which causes pedestrian routes to follow one-way streets like a car.
const OSRM_FOOT = 'https://routing.openstreetmap.de/routed-foot/route/v1/walking';
const OSRM_BIKE = 'https://routing.openstreetmap.de/routed-bike/route/v1/cycling';

export interface DirectionsResult {
  /** Path as [lat, lng] coordinate pairs */
  path: [number, number][];
  /** Distance in meters (along streets) */
  distanceMeters: number;
  /** Duration in seconds (OSRM estimate) */
  durationSeconds: number;
}

/**
 * Fetch walking directions between two points via OSRM.
 * Falls back to a straight line if the API is unavailable.
 */
export async function getWalkingDirections(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<DirectionsResult> {
  try {
    // OSRM expects lng,lat order
    const url = `${OSRM_FOOT}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (!res.ok) throw new Error(`OSRM returned ${res.status}`);

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) {
      throw new Error('OSRM: no route found');
    }

    const route = data.routes[0];
    // GeoJSON coordinates are [lng, lat] — convert to [lat, lng]
    const path: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]],
    );

    return {
      path,
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
    };
  } catch (err) {
    console.warn('OSRM walking directions failed, using straight line:', (err as Error).message);
    // Fallback: straight line with haversine estimate
    const { haversineMeters } = await import('./geo');
    const dist = haversineMeters(fromLat, fromLng, toLat, toLng);
    const WALKING_SPEED_M_PER_MIN = 80;
    return {
      path: [[fromLat, fromLng], [toLat, toLng]],
      distanceMeters: Math.round(dist),
      durationSeconds: Math.round((dist / WALKING_SPEED_M_PER_MIN) * 60),
    };
  }
}

/**
 * Fetch cycling directions between two points via OSRM.
 * Falls back to haversine estimate if API is unavailable.
 */
export async function getCyclingDirections(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): Promise<DirectionsResult> {
  try {
    const url = `${OSRM_BIKE}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (!res.ok) throw new Error(`OSRM bike returned ${res.status}`);

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) {
      throw new Error('OSRM bike: no route found');
    }

    const route = data.routes[0];
    const path: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]],
    );

    return {
      path,
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
    };
  } catch (err) {
    console.warn('OSRM cycling directions failed, using estimate:', (err as Error).message);
    const { haversineMeters } = await import('./geo');
    const dist = haversineMeters(fromLat, fromLng, toLat, toLng);
    const CYCLING_SPEED_M_PER_MIN = 250; // ~15 km/h average city cycling
    return {
      path: [[fromLat, fromLng], [toLat, toLng]],
      distanceMeters: Math.round(dist),
      durationSeconds: Math.round((dist / CYCLING_SPEED_M_PER_MIN) * 60),
    };
  }
}
