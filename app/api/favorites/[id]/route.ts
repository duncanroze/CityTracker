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

    const favorite = await prisma.favorite.findUnique({ where: { id } });
    if (!favorite || favorite.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Favori non trouvé' }, { status: 404 });
    }

    await prisma.favorite.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Favorites DELETE error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
