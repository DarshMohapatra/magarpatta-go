import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const jar = await cookies();
  const token = jar.get('mg_session')?.value;
  if (!token) return NextResponse.json({ authenticated: false });

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    return NextResponse.json({ authenticated: true, phone: decoded.phone });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete('mg_session');
  return NextResponse.json({ ok: true });
}
