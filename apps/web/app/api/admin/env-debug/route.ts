import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';

/**
 * Read-only diagnostic of the Lambda's process.env. Reports presence + a
 * short, non-sensitive prefix for the env vars we care about. NEVER returns
 * full values.
 *
 * Use when an env-dependent feature appears broken even though the dashboard
 * shows the var is set — this proves whether the Lambda actually receives it
 * (Turborepo strict mode, integration-managed scopes, or a stale deploy
 * can all silently drop env vars).
 *
 * Auth: admin session OR Bearer CRON_SECRET. SUPER_ADMIN / OPS only.
 */
const TRACKED_PREFIXES = ['BLOB_', 'AZURE_', 'TWILIO_', 'WHATSAPP_', 'CRON_', 'DATABASE_', 'VERCEL_'];
const TRACKED_EXACT = [
  'BLOB_READ_WRITE_TOKEN',
  'BLOB_STORE_ID',
  'BLOB_WEBHOOK_PUBLIC_KEY',
  'AZURE_TRANSLATOR_KEY',
  'AZURE_TRANSLATOR_REGION',
  'CRON_SECRET',
  'DATABASE_URL',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_FROM',
  'WHATSAPP_TEST_RECIPIENT',
];

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const cronOk = process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  let sessionOk = false;
  if (!cronOk) {
    const admin = await getAdminSession();
    sessionOk = !!admin && (admin.role === 'SUPER_ADMIN' || admin.role === 'OPS');
  }
  if (!cronOk && !sessionOk) {
    return NextResponse.json({ ok: false, error: 'Unauthorized — sign in as SUPER_ADMIN / OPS or pass CRON_SECRET.' }, { status: 401 });
  }

  // What this Lambda actually sees. Helps confirm Turborepo / integration
  // env-passthrough is working.
  const allKeys = Object.keys(process.env);
  const matchingKeys = allKeys.filter((k) => TRACKED_PREFIXES.some((p) => k.startsWith(p))).sort();

  const tracked: Record<string, { present: boolean; length: number; prefix: string }> = {};
  for (const key of TRACKED_EXACT) {
    const v = process.env[key];
    tracked[key] = {
      present: typeof v === 'string' && v.length > 0,
      length: typeof v === 'string' ? v.length : 0,
      // First 8 chars is enough to verify the right value is loaded
      // (e.g. confirm a Blob token starts with "vercel_b") without
      // leaking the secret tail.
      prefix: typeof v === 'string' && v.length > 0 ? `${v.slice(0, 8)}…` : '',
    };
  }

  return NextResponse.json({
    ok: true,
    runtime: 'nodejs',
    totalEnvKeys: allKeys.length,
    // Names of every env var the Lambda has whose key matches one of our
    // tracked prefixes — proves whether BLOB_READ_WRITE_TOKEN is in
    // process.env *at all*. If it's missing here, Turborepo / Vercel is
    // dropping it before the Lambda starts.
    matchingKeys,
    tracked,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    region: process.env.VERCEL_REGION ?? null,
  });
}
