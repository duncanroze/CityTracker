import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { getAuthFromRequest } from '@/lib/server/auth';
import { UPVOTE_TTL_EXTENSION_MS, maxExpiresAt } from '@/lib/server/report-ttl';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report || report.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Signalement non trouvé ou expiré' }, { status: 404 });
    }

    // Can't upvote your own report
    if (report.userId === auth.user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas confirmer votre propre signalement' }, { status: 400 });
    }

    // Idempotent: check if already upvoted
    const existing = await prisma.reportUpvote.findUnique({
      where: { reportId_userId: { reportId: id, userId: auth.user.id } },
    });

    if (existing) {
      return NextResponse.json({ ok: true, alreadyUpvoted: true });
    }

    // Calculate new expiry (capped at 3× base TTL)
    const extension = UPVOTE_TTL_EXTENSION_MS[report.type];
    const cap = maxExpiresAt(report.type, report.createdAt);
    const newExpiry = new Date(Math.min(
      report.expiresAt.getTime() + extension,
      cap.getTime(),
    ));

    await prisma.$transaction([
      prisma.reportUpvote.create({
        data: { reportId: id, userId: auth.user.id },
      }),
      prisma.report.update({
        where: { id },
        data: {
          upvoteCount: { increment: 1 },
          expiresAt: newExpiry,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Report upvote error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
