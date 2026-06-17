import Link from 'next/link';
import type { ReactNode } from 'react';
import { siteConfig } from '@/lib/site-config';

/**
 * Two-pane signin shell for every partner portal (vendor, admin, rider,
 * curator, helpdesk, super-admin). Mirrors the customer AuthShell but
 * tailored to internal-tool framing — left panel emphasises the surface
 * the operator is signing into (Vendor portal / Admin console / etc.)
 * rather than founder copy.
 */
export function PartnerAuthShell({
  surfaceLabel,
  eyebrow,
  title,
  subtitle,
  registerHref,
  registerLabel,
  children,
}: {
  /** "Vendor portal", "Admin console", etc. — shown in the left-pane chip. */
  surfaceLabel: string;
  eyebrow: string;
  title: ReactNode;
  subtitle: ReactNode;
  /** Optional "no account yet?" link target. */
  registerHref?: string;
  registerLabel?: string;
  children: ReactNode;
}) {
  return (
    <main className="font-display min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-[color:var(--color-background)]">
      {/* Left — gradient-warm editorial panel */}
      <section className="relative hidden lg:flex flex-col justify-between gradient-warm text-white p-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 15%, var(--color-saffron), transparent 55%), radial-gradient(circle at 80% 85%, var(--color-accent), transparent 55%)',
          }}
        />
        <div className="absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 bottom-12 h-56 w-56 rounded-full bg-white/8 blur-2xl pointer-events-none" />

        <Link href="/" className="relative inline-flex items-center gap-2.5 w-max">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          <span className="text-[15px] tracking-tight font-medium">
            {siteConfig.wordmarkRoot}{' '}
            <span className="font-display italic">Go</span>
            <span className="ml-2 text-[10.5px] uppercase tracking-[0.18em] opacity-90">
              {surfaceLabel}
            </span>
          </span>
        </Link>

        <div className="relative">
          <p className="text-[11px] uppercase tracking-[0.18em] opacity-90 mb-5">
            Internal access only
          </p>
          <p className="font-display text-[38px] xl:text-[44px] leading-[1.08] tracking-[-0.015em] max-w-md">
            Every action is logged.
            <br />
            <span className="italic opacity-90">Every change reviewed.</span>
          </p>
          <p className="mt-6 text-[14px] opacity-85 max-w-md">
            One platform, one township, every partner accountable.
            {siteConfig.platformName} keeps an audit trail of who did what
            and when.
          </p>
        </div>

        <div className="relative text-[11px] uppercase tracking-[0.14em] opacity-75">
          © {new Date().getFullYear()} · {siteConfig.platformName}
        </div>
      </section>

      {/* Right — form */}
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="lg:hidden mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-saffron)]" />
            <span className="text-[15px] tracking-tight font-medium">
              {siteConfig.wordmarkRoot}{' '}
              <span className="font-display italic text-[color:var(--color-primary)]">Go</span>
              <span className="ml-2 text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-terracotta)]">
                {surfaceLabel}
              </span>
            </span>
          </Link>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
            {eyebrow}
          </div>
          <h1 className="mt-4 font-display text-[40px] sm:text-[48px] leading-[1.02] tracking-[-0.02em] text-[color:var(--color-foreground)]">
            {title}
          </h1>
          <p className="mt-4 text-[14.5px] leading-[1.6] text-[color:var(--color-muted)]">
            {subtitle}
          </p>

          <div className="mt-8">{children}</div>

          {registerHref && (
            <p className="mt-10 text-[12.5px] text-[color:var(--color-muted)]/70">
              New here?{' '}
              <Link href={registerHref} className="underline underline-offset-4 hover:text-[color:var(--color-primary)]">
                {registerLabel ?? 'Register'}
              </Link>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
