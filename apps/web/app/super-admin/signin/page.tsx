import { redirect } from 'next/navigation';
import { getSuperSession } from '@/lib/super-admin-session';
import { SuperSignInClient } from './signin-client';

export const dynamic = 'force-dynamic';

export default async function SuperAdminSignInPage() {
  const session = await getSuperSession();
  if (session) redirect('/super-admin');

  return (
    <main className="min-h-screen bg-[color:var(--color-primary)] text-[color:var(--color-background)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-saffron-soft)]">
          Cross-instance · super admin
        </div>
        <h1 className="mt-3 font-display text-[40px] sm:text-[52px] leading-[1.02] tracking-[-0.02em]">
          Watch every site from <span className="italic text-[color:var(--color-saffron-soft)]">one place.</span>
        </h1>
        <p className="mt-4 text-[14px] text-[color:var(--color-background)]/70">
          Read-only overview across Magarpatta City and Amanora Park Town. Different login from
          each site&apos;s own admin — supervises both, can write to neither.
        </p>

        <div className="mt-10 rounded-2xl border border-[color:var(--color-background)]/15 bg-[color:var(--color-primary)] p-6">
          <SuperSignInClient />
        </div>

        <p className="mt-6 text-[11.5px] text-[color:var(--color-background)]/55 text-center">
          Sessions expire after 8 hours.
        </p>
      </div>
    </main>
  );
}
