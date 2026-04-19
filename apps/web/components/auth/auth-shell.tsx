import Link from 'next/link';
import type { ReactNode } from 'react';

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Left — editorial panel */}
      <section className="relative hidden lg:flex flex-col justify-between bg-[color:var(--color-forest)] text-[color:var(--color-cream)] p-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 15%, var(--color-saffron), transparent 55%), radial-gradient(circle at 80% 85%, var(--color-terracotta), transparent 55%)',
          }}
        />

        <Link href="/" className="relative inline-flex items-center gap-2.5 w-max">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-saffron)]" />
          <span className="text-[15px] tracking-tight font-medium">
            Magarpatta <span className="font-serif italic text-[color:var(--color-saffron-soft)]">Go</span>
          </span>
        </Link>

        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-saffron-soft)] mb-5">
            A note from the founders
          </p>
          <p className="font-serif text-[38px] xl:text-[46px] leading-[1.08] tracking-[-0.015em] max-w-lg">
            We haven&rsquo;t been here long.
            <br />
            <span className="italic text-[color:var(--color-saffron-soft)]">But we already know</span>
            <br />
            which lift in Cosmos is slow, which guard works the late shift at Aspen&rsquo;s east gate, and which dal at Kalika sells out by 8 PM.
          </p>
          <p className="mt-6 text-[14px] text-[color:var(--color-cream)]/70 max-w-md">
            We live in Magarpatta too. Welcome in.
          </p>
          <p className="mt-5 text-[12px] uppercase tracking-[0.14em] text-[color:var(--color-saffron-soft)]/75">
            — The team · launching April 2026
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-4 text-[color:var(--color-cream)]/70">
          {[
            { v: '16', l: 'societies' },
            { v: '4', l: 'riders' },
            { v: '25m', l: 'median ETA' },
          ].map((s) => (
            <div key={s.l}>
              <div className="font-serif text-[32px] leading-none text-[color:var(--color-cream)]">{s.v}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.14em]">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Right — form */}
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="lg:hidden mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-saffron)]" />
            <span className="text-[15px] tracking-tight font-medium">
              Magarpatta <span className="font-serif italic text-[color:var(--color-forest)]">Go</span>
            </span>
          </Link>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
            {eyebrow}
          </div>
          <h1 className="mt-4 font-serif text-[44px] sm:text-[52px] leading-[1.02] tracking-[-0.02em] text-[color:var(--color-ink)]">
            {title}
          </h1>
          <p className="mt-5 text-[15px] leading-[1.6] text-[color:var(--color-ink-soft)]">{subtitle}</p>

          <div className="mt-10">{children}</div>

          <p className="mt-10 text-[12.5px] text-[color:var(--color-ink-soft)]/70">
            New to Magarpatta Go?{' '}
            <Link href="/signin" className="underline underline-offset-4 hover:text-[color:var(--color-forest)]">
              Create an account — it&apos;s the same flow.
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
