import { NextRequest, NextResponse } from 'next/server';
import { getSessionTokenFromRequest, invalidateSession, clearSessionCookie } from '@/lib/server/auth';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = await getSessionTokenFromRequest(request);
    if (sessionToken) {
      await invalidateSession(sessionToken);
    }
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (err) {
    console.error('Logout error:', err);
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  }
}
