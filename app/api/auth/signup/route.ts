import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { hashPassword, generateVerificationCode } from '@/lib/server/auth';
import { sendVerificationCode } from '@/lib/server/email';

const signupSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caracteres'),
  displayName: z.string().min(1).max(50).optional(),
});

const CODE_EXPIRY_MINUTES = 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const { email, password, displayName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      // If already verified, reject
      if (existing.emailVerified) {
        return NextResponse.json(
          { error: 'Un compte existe deja avec cet email' },
          { status: 409 },
        );
      }

      // Unverified account exists — regenerate code and resend
      const code = generateVerificationCode();
      const hashedCode = await hashPassword(code);
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash: await hashPassword(password),
          displayName,
          verificationCode: hashedCode,
          verificationExpiresAt: new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000),
        },
      });

      await sendVerificationCode(email, code);
      return NextResponse.json({ pendingVerification: true, email }, { status: 201 });
    }

    const code = generateVerificationCode();
    const hashedCode = await hashPassword(code);
    const passwordHash = await hashPassword(password);

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        emailVerified: false,
        verificationCode: hashedCode,
        verificationExpiresAt: new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000),
      },
    });

    await sendVerificationCode(email, code);
    return NextResponse.json({ pendingVerification: true, email }, { status: 201 });
  } catch (err) {
    console.error('Signup error:', err);
    const message = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
