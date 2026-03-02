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
        const parts: string[] = [];
        if (a.house_number) parts.push(a.house_number);
        parts.push(a.road);
        if (a.postcode || a.city || a.municipality) {
          parts.push([a.postcode, a.city || a.municipality].filter(Boolean).join(' '));
        }
        address = parts.join(', ');
      }

      return NextResponse.json({
        address,
        lat: parseFloat(revData.lat),
        lng: parseFloat(revData.lon),
      });
    }

    // Forward geocoding: ?q=...
    const parsed = querySchema.safeParse({ q: searchParams.get('q') });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { q } = parsed.data;

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '5');
    url.searchParams.set('viewbox', '2.1,48.95,2.6,48.75');
    url.searchParams.set('bounded', '0');
    url.searchParams.set('countrycodes', 'fr');
    url.searchParams.set('dedupe', '1');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'CityTracker/1.0 (paris transport app)',
        'Accept-Language': 'fr',
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Geocoding service unavailable' },
        { status: 502 },
      );
    }

    const data: NominatimResult[] = await res.json();

    const results = data.map((r) => {
      // Build a concise address from structured fields when available
      const a = r.address;
      let address = r.display_name;
      if (a?.road) {
        const parts: string[] = [];
        if (a.house_number) parts.push(a.house_number);
        parts.push(a.road);
        if (a.postcode || a.city) {
          parts.push([a.postcode, a.city].filter(Boolean).join(' '));
        }
        address = parts.join(', ');
      }
      return {
        address,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      };
    });

    return NextResponse.json(results, {
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
