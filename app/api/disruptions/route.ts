import { NextResponse } from 'next/server';
import { getDisruptions } from '@/lib/server/disruptions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const disruptions = await getDisruptions();

    // Return as object keyed by line code
    const result: Record<string, { severity: string; message: string | null }> = {};
    for (const [code, d] of disruptions) {
      if (d.severity !== 'ok') {
        result[code] = { severity: d.severity, message: d.message };
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error fetching disruptions:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
