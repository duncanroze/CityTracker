import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { getAuthFromRequest } from '@/lib/server/auth';
import type { CommunityReport } from '@/types';

function computeConfidence(upvoteCount: number, createdAt: Date): number {
  const ageMinutes = (Date.now() - createdAt.getTime()) / 60_000;
  const recencyBonus = Math.max(0, 0.2 - ageMinutes * 0.002);
  return Math.min(1, 0.3 + upvoteCount * 0.15 + recencyBonus);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationIdsRaw = searchParams.get('stationIds');
    const lineCodesRaw = searchParams.get('lineCodes');

    if (!stationIdsRaw) {
      return NextResponse.json({ reports: [] });
    }

    const stationIds = stationIdsRaw.split(',').filter(Boolean);
    const lineCodes = lineCodesRaw?.split(',').filter(Boolean) ?? [];

    const auth = await getAuthFromRequest(request);
    const userId = auth?.user.id;

    const reports = await prisma.report.findMany({
      where: {
        expiresAt: { gt: new Date() },
        stationId: { in: stationIds },
        ...(lineCodes.length > 0
          ? { OR: [{ lineCode: { in: lineCodes } }, { lineCode: null }] }
          : {}),
      },
      include: {
        station: { select: { name: true, latitude: true, longitude: true } },
        user: { select: { displayName: true } },
        upvotes: userId ? { where: { userId }, select: { id: true } } : false,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
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
    console.error('Route alerts GET error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
