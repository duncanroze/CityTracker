import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { getAuthFromRequest } from '@/lib/server/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership before deleting
  const favorite = await prisma.favorite.findUnique({ where: { id } });
  if (!favorite || favorite.userId !== auth.user.id) {
    return NextResponse.json({ error: 'Favori non trouve' }, { status: 404 });
  }

  await prisma.favorite.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
