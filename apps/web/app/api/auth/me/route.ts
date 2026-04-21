import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/session';

/**
 * Combined session + profile endpoint.
 *
 * Replaces two sequential client calls (/api/auth/session → /api/users/me)
 * with a single network round-trip so navbar hydration flicker goes away.
 */
export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json(
      { authenticated: false },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
  return NextResponse.json(
    { authenticated: true, user: session },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
