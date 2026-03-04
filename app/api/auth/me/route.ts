import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, sanitizeUser } from '@/lib/server/auth';

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
