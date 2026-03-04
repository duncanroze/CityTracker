import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { verifyPassword, createSession, setSessionCookie, sanitizeUser } from '@/lib/server/auth';

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides' }, { status: 400 });
    }

    const { email, code } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified || !user.verificationCode) {
      return NextResponse.json({ error: 'Code invalide' }, { status: 400 });
    }

    // Rate limiting: max 5 attempts, then lock out
    if (user.verificationAttempts >= 5) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Demandez un nouveau code.' },
        { status: 429 },
      );
    }

    // Check expiry
    if (user.verificationExpiresAt && user.verificationExpiresAt < new Date()) {
      return NextResponse.json({ error: 'Code expiré, demandez un nouveau code' }, { status: 410 });
    }

    // Timing-safe comparison via bcrypt verify
    const valid = await verifyPassword(code, user.verificationCode);
    if (!valid) {
      await prisma.user.update({
        where: { id: user.id },
        data: { verificationAttempts: { increment: 1 } },
      });
      return NextResponse.json({ error: 'Code incorrect' }, { status: 401 });
    }

    // Mark verified and clear code
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationExpiresAt: null,
        verificationAttempts: 0,
      },
    });

    // Create session
    const { token, expiresAt } = await createSession(updatedUser.id);
    const response = NextResponse.json({ user: sanitizeUser(updatedUser) });
    await setSessionCookie(response, token, expiresAt);
    return response;
  } catch (err) {
    console.error('Verify error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
