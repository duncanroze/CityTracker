import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { getAuthFromRequest } from '@/lib/server/auth';

const MAX_FAVORITES = 10;

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: 'desc' },
      take: MAX_FAVORITES,
    });

    return NextResponse.json({
      favorites: favorites.map(f => ({
        id: f.id,
        from: { lat: f.fromLat, lng: f.fromLng, label: f.fromLabel },
        to: { lat: f.toLat, lng: f.toLng, label: f.toLabel },
        createdAt: f.createdAt.getTime(),
      })),
    });
  } catch (err) {
    console.error('Favorites GET error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

const createSchema = z.object({
  from: z.object({
    lat: z.number(),
    lng: z.number(),
    label: z.string(),
  }),
  to: z.object({
    lat: z.number(),
    lng: z.number(),
    label: z.string(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
    }
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    const { from, to } = parsed.data;

    const favorite = await prisma.favorite.upsert({
      where: {
        userId_fromLat_fromLng_toLat_toLng: {
          userId: auth.user.id,
          fromLat: from.lat,
          fromLng: from.lng,
          toLat: to.lat,
          toLng: to.lng,
        },
      },
      update: {
        fromLabel: from.label,
        toLabel: to.label,
      },
      create: {
        userId: auth.user.id,
        fromLat: from.lat,
        fromLng: from.lng,
        fromLabel: from.label,
        toLat: to.lat,
        toLng: to.lng,
        toLabel: to.label,
      },
    });

    const count = await prisma.favorite.count({ where: { userId: auth.user.id } });
    if (count > MAX_FAVORITES) {
      const oldest = await prisma.favorite.findMany({
        where: { userId: auth.user.id },
        orderBy: { createdAt: 'asc' },
        take: count - MAX_FAVORITES,
        select: { id: true },
      });
      if (oldest.length > 0) {
        await prisma.favorite.deleteMany({
          where: { id: { in: oldest.map(f => f.id) } },
        });
      }
    }

    return NextResponse.json({
      favorite: {
        id: favorite.id,
        from: { lat: favorite.fromLat, lng: favorite.fromLng, label: favorite.fromLabel },
        to: { lat: favorite.toLat, lng: favorite.toLng, label: favorite.toLabel },
        createdAt: favorite.createdAt.getTime(),
      },
    });
  } catch (err) {
    console.error('Favorites POST error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
