import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { getAuthFromRequest } from '@/lib/server/auth';
import { REPORT_TTL_MS, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from '@/lib/server/report-ttl';
import type { CommunityReport } from '@/types';

function computeConfidence(upvoteCount: number, createdAt: Date): number {
  const ageMinutes = (Date.now() - createdAt.getTime()) / 60_000;
  const recencyBonus = Math.max(0, 0.2 - ageMinutes * 0.002);
  return Math.min(1, 0.3 + upvoteCount * 0.15 + recencyBonus);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('stationId');
    const lineCode = searchParams.get('lineCode');
    const type = searchParams.get('type');

    const auth = await getAuthFromRequest(request);
    const userId = auth?.user.id;

    const where: Record<string, unknown> = {
      expiresAt: { gt: new Date() },
    };
    if (stationId) where.stationId = stationId;
    if (lineCode) where.lineCode = lineCode;
    if (type) where.type = type;

    const reports = await prisma.report.findMany({
      where,
      include: {
        station: { select: { name: true, latitude: true, longitude: true } },
        user: { select: { displayName: true } },
        upvotes: userId ? { where: { userId }, select: { id: true } } : false,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const results: CommunityReport[] = reports.map(r => ({
      id: r.id,
      type: r.type,
      locationType: r.locationType,
      stationId: r.stationId,
      stationName: r.station.name,
      stationLat: r.station.latitude,
      stationLng: r.station.longitude,
      lineCode: r.lineCode,
      direction: r.direction,
      fromLineCode: r.fromLineCode,
      toLineCode: r.toLineCode,
      comment: r.comment,
      upvoteCount: r.upvoteCount,
      userUpvoted: Array.isArray(r.upvotes) ? r.upvotes.length > 0 : false,
      confidence: computeConfidence(r.upvoteCount, r.createdAt),
      expiresAt: r.expiresAt.getTime(),
      createdAt: r.createdAt.getTime(),
      reporterName: r.user.displayName
        ? r.user.displayName[0].toUpperCase() + '.'
        : null,
      userId: r.userId,
    }));

    return NextResponse.json({ reports: results });
  } catch (err) {
    console.error('Reports GET error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

const createSchema = z.object({
  type: z.enum(['CONTROLEURS', 'RAME_BONDEE', 'ESCALATOR_PANNE', 'ASCENSEUR_PANNE', 'RETARD_NON_SIGNALE', 'GREVE']),
  locationType: z.enum(['PLATFORM', 'TRANSFER_CORRIDOR', 'STATION_EXIT']),
  stationId: z.string().min(1),
  lineCode: z.string().optional().nullable(),
  direction: z.string().optional().nullable(),
  fromLineCode: z.string().optional().nullable(),
  toLineCode: z.string().optional().nullable(),
  comment: z.string().max(140).optional().nullable(),
}).refine(data => {
  if (data.locationType === 'PLATFORM') return !!data.lineCode;
  if (data.locationType === 'TRANSFER_CORRIDOR') return !!data.fromLineCode && !!data.toLineCode;
  return true;
}, { message: 'Champs manquants pour ce type de localisation' });

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
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' }, { status: 400 });
    }

    const data = parsed.data;

    // Rate limiting: max 5 reports per 15 min
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recentCount = await prisma.report.count({
      where: {
        userId: auth.user.id,
        createdAt: { gte: windowStart },
      },
    });
    if (recentCount >= RATE_LIMIT_MAX) {
      return NextResponse.json({ error: 'Trop de signalements récents. Réessayez dans quelques minutes.' }, { status: 429 });
    }

    // Verify station exists
    const station = await prisma.station.findUnique({ where: { id: data.stationId } });
    if (!station) {
      return NextResponse.json({ error: 'Station non trouvée' }, { status: 404 });
    }

    const now = new Date();
    const ttl = REPORT_TTL_MS[data.type];
    const expiresAt = new Date(now.getTime() + ttl);

    const report = await prisma.report.create({
      data: {
        type: data.type,
        locationType: data.locationType,
        stationId: data.stationId,
        lineCode: data.lineCode ?? null,
        direction: data.direction ?? null,
        fromLineCode: data.fromLineCode ?? null,
        toLineCode: data.toLineCode ?? null,
        comment: data.comment ?? null,
        userId: auth.user.id,
        expiresAt,
      },
      include: {
        station: { select: { name: true, latitude: true, longitude: true } },
        user: { select: { displayName: true } },
      },
    });

    const result: CommunityReport = {
      id: report.id,
      type: report.type,
      locationType: report.locationType,
      stationId: report.stationId,
      stationName: report.station.name,
      stationLat: report.station.latitude,
      stationLng: report.station.longitude,
      lineCode: report.lineCode,
      direction: report.direction,
      fromLineCode: report.fromLineCode,
      toLineCode: report.toLineCode,
      comment: report.comment,
      upvoteCount: 0,
      userUpvoted: false,
      confidence: 0.3,
      expiresAt: report.expiresAt.getTime(),
      createdAt: report.createdAt.getTime(),
      reporterName: report.user.displayName
        ? report.user.displayName[0].toUpperCase() + '.'
        : null,
      userId: report.userId,
    };

    return NextResponse.json({ report: result }, { status: 201 });
  } catch (err) {
    console.error('Reports POST error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
