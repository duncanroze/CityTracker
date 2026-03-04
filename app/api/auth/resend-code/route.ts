import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { hashPassword, generateVerificationCode } from '@/lib/server/auth';
import { sendVerificationCode } from '@/lib/server/email';

const resendSchema = z.object({
  email: z.string().email(),
});

const CODE_EXPIRY_MINUTES = 10;
const MIN_RESEND_INTERVAL_MS = 60 * 1000; // 1 minute between resends

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified) {
      // Don't reveal whether email exists
      return NextResponse.json({ ok: true });
    }

    // Rate limit: check if last code was sent less than 1 minute ago
    if (user.verificationExpiresAt) {
      const codeSentAt = new Date(user.verificationExpiresAt.getTime() - CODE_EXPIRY_MINUTES * 60 * 1000);
      if (Date.now() - codeSentAt.getTime() < MIN_RESEND_INTERVAL_MS) {
        return NextResponse.json(
          { error: 'Veuillez patienter avant de renvoyer un code' },
          { status: 429 },
        );
      }
    }

    const code = generateVerificationCode();
    const hashedCode = await hashPassword(code);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode: hashedCode,
        verificationExpiresAt: new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000),
      },
    });

    await sendVerificationCode(email, code);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Resend code error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
