import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { getAuthFromRequest } from '@/lib/server/auth';

export async function DELETE(
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
    if (!report || report.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Signalement non trouvé' }, { status: 404 });
    }

    await prisma.report.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Report DELETE error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
