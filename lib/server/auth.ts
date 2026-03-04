import { hash, compare } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import type { User, Session } from '@prisma/client';

const COST_FACTOR = 12;
const SESSION_DURATION_DAYS = 7;
const COOKIE_NAME = 'session';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET is not configured');
  }
  return new TextEncoder().encode(secret);
}

// ─── Password ───────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return hash(password, COST_FACTOR);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

// ─── Session ────────────────────────────────────────────────

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: { userId, token: crypto.randomUUID(), expiresAt },
  });
  return { token: session.token, expiresAt: session.expiresAt };
}

export async function validateSession(token: string): Promise<{ user: User; session: Session } | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return { user: session.user, session };
}

export async function invalidateSession(token: string): Promise<void> {
  await prisma.session.delete({ where: { token } }).catch(() => {});
}

// ─── JWT Cookie ─────────────────────────────────────────────

export async function createSessionJwt(sessionToken: string): Promise<string> {
  return new SignJWT({ sessionToken })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(getJwtSecret());
}

export async function verifySessionJwt(jwt: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(jwt, getJwtSecret());
    return (payload as { sessionToken?: string }).sessionToken ?? null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(response: NextResponse, sessionToken: string, expiresAt: Date): Promise<void> {
  const jwt = await createSessionJwt(sessionToken);
  response.cookies.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

// ─── Request helpers ────────────────────────────────────────

export async function getSessionTokenFromRequest(request: NextRequest): Promise<string | null> {
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  return verifySessionJwt(cookie);
}

export async function getAuthFromRequest(request: NextRequest): Promise<{ user: User; session: Session } | null> {
  const sessionToken = await getSessionTokenFromRequest(request);
  if (!sessionToken) return null;
  return validateSession(sessionToken);
}

// ─── Verification code ───────────────────────────────────────

export function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ─── Public user shape (no password hash) ───────────────────

export function sanitizeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}
