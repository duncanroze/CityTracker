import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { verifyPassword, createSession, setSessionCookie, sanitizeUser } from '@/lib/server/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Email ou mot de passe invalide' },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 },
      );
    }

    // Block unverified accounts
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Email non verifie', pendingVerification: true, email },
        { status: 403 },
      );
    }

    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json({ user: sanitizeUser(user) });
    await setSessionCookie(response, token, expiresAt);
    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
