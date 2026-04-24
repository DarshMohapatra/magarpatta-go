import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getRiderSession } from '@/lib/rider-session';
import { RiderFeedbackClient } from './feedback-client';

export const dynamic = 'force-dynamic';

export default async function RiderFeedbackPage() {
  const rider = await getRiderSession();
  if (!rider) redirect('/rider/signin');
  return (
    <main className="min-h-screen">
      <header className="border-b border-[color:var(--color-ink)]/8 bg-[color:var(--color-paper)]">
        <div className="mx-auto max-w-[1080px] px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link href="/rider" className="flex items-center gap-2.5">
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-saffron)] pulse-ring" />
            <span className="text-[14px] tracking-tight font-medium">
              Magarpatta <span className="font-serif italic text-[color:var(--color-forest)]">Go</span>
              <span className="ml-1.5 text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-terracotta)]">Rider</span>
            </span>
          </Link>
          <div className="flex items-center gap-4 text-[12.5px]">
            <Link href="/rider" className="text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)]">← Back to dashboard</Link>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-[1080px] px-4 sm:px-6 py-8">
        <RiderFeedbackClient rider={{ name: rider.name }} />
      </section>
    </main>
  );
}
