import type { ReactNode } from 'react';

/**
 * Lovable gradient-warm hero card shared by every partner-side inner page
 * (vendor + admin + curator + helpdesk + super-admin). Renders the eyebrow
 * + display title + optional summary line on a gradient-warm background
 * with two translucent orbs.
 *
 * Usage:
 *   <PartnerPageHero
 *     eyebrow="Riders"
 *     title="On-shift, on the dot."
 *     summary={`${onShift} on shift · ${pending} awaiting approval`}
 *     actions={<button className="rounded-full bg-white text-...">Add rider</button>}
 *   />
 */
export function PartnerPageHero({
  eyebrow,
  title,
  summary,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  summary?: ReactNode;
  /** Optional right-side actions (white pills look best). */
  actions?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-2xl)] gradient-warm text-white p-5 sm:p-6 shadow-[var(--shadow-glow)]">
      <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10.5px] uppercase tracking-[0.18em] font-semibold opacity-90">
            {eyebrow}
          </div>
          <h1 className="mt-2 font-display text-[26px] sm:text-[30px] leading-tight tracking-tight">
            {title}
          </h1>
          {summary && (
            <p className="mt-1 text-[12.5px] opacity-90">
              {summary}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
