import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthFromRequest, sanitizeUser } from '@/lib/server/auth';
import { prisma } from '@/lib/server/prisma';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({ user: sanitizeUser(auth.user) });
  } catch (err) {
    console.error('Auth check error:', err);
    return NextResponse.json({ user: null });
  }
}

const patchSchema = z.object({
  theme: z.enum(['dark', 'light']).optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'Aucun champ à mettre à jour' });

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    let body;
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Données invalides' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: auth.user.id },
      data: parsed.data,
    });

    return NextResponse.json({ user: sanitizeUser(updated) });
  } catch (err) {
    console.error('User PATCH error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
