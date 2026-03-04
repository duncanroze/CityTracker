import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const querySchema = z.object({
  q: z.string().min(2, 'Query must be at least 2 characters'),
});

const reverseSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

interface NominatimAddress {
  house_number?: string;
  road?: string;
  suburb?: string;
  city?: string;
  postcode?: string;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Reverse geocoding: ?lat=48.85&lng=2.35
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    if (lat && lng) {
      const parsedReverse = reverseSchema.safeParse({ lat, lng });
      if (!parsedReverse.success) {
        return NextResponse.json({ error: 'Invalid lat/lng' }, { status: 400 });
      }

      const revUrl = new URL('https://nominatim.openstreetmap.org/reverse');
      revUrl.searchParams.set('lat', parsedReverse.data.lat.toString());
      revUrl.searchParams.set('lon', parsedReverse.data.lng.toString());
      revUrl.searchParams.set('format', 'json');
      revUrl.searchParams.set('addressdetails', '1');
      revUrl.searchParams.set('zoom', '18');

      const revRes = await fetch(revUrl.toString(), {
        headers: {
          'User-Agent': 'CityTracker/1.0 (paris transport app)',
          'Accept-Language': 'fr',
        },
        next: { revalidate: 300 },
      });

      if (!revRes.ok) {
        return NextResponse.json({ error: 'Reverse geocoding unavailable' }, { status: 502 });
      }

      const revData = await revRes.json();
      if (revData.error) {
        return NextResponse.json({ error: revData.error }, { status: 404 });
      }

      const a = revData.address;
      let address = revData.display_name;
      if (a?.road) {
        const clean = (s: string) => s.replace(/[,\s]+$/, '').trim();
        const parts: string[] = [];
        if (a.house_number) parts.push(clean(a.house_number));
        parts.push(clean(a.road));
        const cityPart = [a.postcode, a.city || a.municipality].filter(Boolean).map(clean).join(' ');
        if (cityPart) parts.push(cityPart);
        address = parts.join(', ');
      }

      return NextResponse.json({
        address,
        lat: parseFloat(revData.lat),
        lng: parseFloat(revData.lon),
      });
    }

    // Forward geocoding via BAN (Base Adresse Nationale): ?q=...
    const parsed = querySchema.safeParse({ q: searchParams.get('q') });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { q } = parsed.data;

    interface BANFeature {
      geometry: { coordinates: [number, number] };
      properties: { label: string; score: number; postcode?: string };
    }

    // Two parallel requests: Paris-specific + general with proximity bias
    const parisUrl = new URL('https://api-adresse.data.gouv.fr/search/');
    parisUrl.searchParams.set('q', q);
    parisUrl.searchParams.set('limit', '5');
    parisUrl.searchParams.set('citycode', '75056');

    const generalUrl = new URL('https://api-adresse.data.gouv.fr/search/');
    generalUrl.searchParams.set('q', q);
    generalUrl.searchParams.set('limit', '20');
    generalUrl.searchParams.set('lat', '48.8566');
    generalUrl.searchParams.set('lon', '2.3522');

    const [parisRes, generalRes] = await Promise.all([
      fetch(parisUrl.toString(), { next: { revalidate: 300 } }),
      fetch(generalUrl.toString(), { next: { revalidate: 300 } }),
    ]);

    const IDF_DEPTS = new Set(['75', '77', '78', '91', '92', '93', '94', '95']);

    const parisData: { features: BANFeature[] } = parisRes.ok
      ? await parisRes.json()
      : { features: [] };
    const generalData: { features: BANFeature[] } = generalRes.ok
      ? await generalRes.json()
      : { features: [] };

    // Merge all features, dedupe, sort by composite score (BAN score + IDF boost)
    const seen = new Set<string>();
    const scored: { address: string; lat: number; lng: number; sortScore: number }[] = [];

    function addFeature(f: BANFeature, parisBoost: number) {
      const key = `${f.geometry.coordinates[1].toFixed(5)},${f.geometry.coordinates[0].toFixed(5)}`;
      if (seen.has(key)) return;
      seen.add(key);
      const dept = (f.properties.postcode ?? '').slice(0, 2);
      const idfBoost = IDF_DEPTS.has(dept) ? 0.05 : 0;
      scored.push({
        address: f.properties.label,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        sortScore: f.properties.score + parisBoost + idfBoost,
      });
    }

    // Paris results get a small boost but don't unconditionally dominate
    for (const f of parisData.features) addFeature(f, 0.05);
    for (const f of generalData.features) addFeature(f, 0);

    // Sort by composite score descending — best matches first regardless of source
    scored.sort((a, b) => b.sortScore - a.sortScore);

    const merged = scored.map(({ address, lat, lng }) => ({ address, lat, lng }));

    return NextResponse.json(merged.slice(0, 5), {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error('Geocode error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
