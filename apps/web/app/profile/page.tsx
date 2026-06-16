import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCustomerScope } from '@/lib/customer-scope';
import { getServerSession } from '@/lib/session';
import { getMembershipState } from '@/lib/membership';
import { MobileShell } from '@/components/customer/mobile-shell';
import { TopBar } from '@/components/customer/top-bar';
import { CartDrawer } from '@/components/cart-drawer';
import { SignOutButton } from './sign-out-button';
import { siteConfig } from '@/lib/site-config';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const scope = await getCustomerScope();
  if (!scope) redirect('/signin');

  const [session, membership, orderCount, openTicketCount] = await Promise.all([
    getServerSession(),
    getMembershipState(scope.userId),
    scope.db.order.count(),
    scope.db.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_REVIEW', 'AWAITING_CUSTOMER'] } } }),
  ]);

  const defaultAddress = session?.addresses.find((a) => a.isDefault) ?? session?.addresses[0] ?? null;
  const displayName = session?.name?.trim() || 'Neighbour';
  const initial = (displayName || 'N').charAt(0).toUpperCase();

  return (
    <>
      <MobileShell topBar={<TopBar session={session} />}>
        {/* Gradient-warm hero with avatar + name (matches /home promo banner) */}
        <section className="px-4 pt-4">
          <div className="relative overflow-hidden rounded-[var(--radius-2xl)] gradient-warm text-white p-6 shadow-[var(--shadow-glow)]">
            <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-4">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-[28px] font-display">
                {initial}
              </span>
              <div className="min-w-0">
                <div className="text-[10.5px] uppercase tracking-[0.18em] opacity-85">Signed in</div>
                <div className="mt-1 font-display text-[26px] leading-none truncate">{displayName}</div>
                <div className="mt-1.5 text-[12.5px] opacity-90">+91 {session?.phone}</div>
              </div>
            </div>
            {defaultAddress && (
              <div className="relative mt-5 rounded-[var(--radius-lg)] bg-white/15 backdrop-blur-sm border border-white/20 px-3.5 py-2.5 text-[12px]">
                <div className="text-[10px] uppercase tracking-[0.16em] opacity-85 mb-0.5">Default address</div>
                <div className="font-medium">
                  Flat {defaultAddress.flat}, {defaultAddress.building} · {defaultAddress.society}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Quick stats — orders + membership credits + open tickets */}
        <section className="px-4 pt-4">
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile
              label="Orders"
              value={String(orderCount)}
              href="/orders"
              tone="primary"
            />
            <StatTile
              label="Free deliveries"
              value={membership.isActive ? String(membership.creditsLeft) : '—'}
              sub={membership.isActive ? 'left this cycle' : 'no plan'}
              href="/account/membership"
              tone="accent"
            />
            <StatTile
              label="Open tickets"
              value={String(openTicketCount)}
              href="/support"
              tone={openTicketCount > 0 ? 'warning' : 'muted'}
            />
          </div>
        </section>

        {/* Section cards — every original sub-tab is reachable from here */}
        <section className="px-4 pt-6">
          <h2 className="font-display text-[17px] font-bold tracking-tight mb-3">Your account</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <SectionCard
              href="/orders"
              icon={<IconOrders />}
              title="My orders"
              body={orderCount === 0 ? 'No orders yet — start shopping' : `${orderCount} order${orderCount === 1 ? '' : 's'} placed`}
            />
            <SectionCard
              href="/account/addresses"
              icon={<IconPin />}
              title="Saved addresses"
              body={session?.addresses.length
                ? `${session.addresses.length} address${session.addresses.length === 1 ? '' : 'es'} on file`
                : 'Add your first delivery address'}
            />
            <SectionCard
              href="/account/membership"
              icon={<IconStar />}
              title="Membership"
              body={membership.isActive
                ? `${membership.subscription?.planNameSnapshot ?? 'Active plan'} · ${membership.creditsLeft} left`
                : `Save on every delivery with ${siteConfig.platformName}`}
              highlight={!membership.isActive}
            />
            <SectionCard
              href="/support"
              icon={<IconChat />}
              title="Help & support"
              body={openTicketCount > 0
                ? `${openTicketCount} open ticket${openTicketCount === 1 ? '' : 's'}`
                : 'Anything went wrong? File a ticket'}
            />
          </div>
        </section>

        {/* More — language picker hint + sign-out */}
        <section className="px-4 pt-6">
          <h2 className="font-display text-[17px] font-bold tracking-tight mb-3">More</h2>
          <div className="rounded-[var(--radius-xl)] bg-[color:var(--color-surface)] border border-[color:var(--color-border)]/60 shadow-[var(--shadow-soft)] divide-y divide-[color:var(--color-border)]/50">
            <Link href="/menu" className="flex items-center justify-between px-4 py-3.5 text-[14px] hover:bg-[color:var(--color-background)]/40 transition-colors">
              <span className="flex items-center gap-3">
                <span className="text-[color:var(--color-primary)]"><IconSearch /></span>
                Browse the menu
              </span>
              <ChevronRight />
            </Link>
            <Link href="/restaurants" className="flex items-center justify-between px-4 py-3.5 text-[14px] hover:bg-[color:var(--color-background)]/40 transition-colors">
              <span className="flex items-center gap-3">
                <span className="text-[color:var(--color-primary)]"><IconStore /></span>
                All vendors
              </span>
              <ChevronRight />
            </Link>
            <Link href="/support/new" className="flex items-center justify-between px-4 py-3.5 text-[14px] hover:bg-[color:var(--color-background)]/40 transition-colors">
              <span className="flex items-center gap-3">
                <span className="text-[color:var(--color-primary)]"><IconPlus /></span>
                File a new ticket
              </span>
              <ChevronRight />
            </Link>
            <SignOutButton />
          </div>
        </section>

        <section className="px-4 pt-8 pb-4 text-center">
          <p className="text-[11px] text-[color:var(--color-muted)] leading-relaxed">
            {siteConfig.platformName} · {siteConfig.siteName}, {siteConfig.city}
          </p>
        </section>
      </MobileShell>
      <CartDrawer />
    </>
  );
}

function StatTile({
  label,
  value,
  sub,
  href,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  href: string;
  tone: 'primary' | 'accent' | 'warning' | 'muted';
}) {
  const toneClass =
    tone === 'primary' ? 'text-[color:var(--color-primary)]' :
    tone === 'accent' ? 'text-[color:var(--color-accent)]' :
    tone === 'warning' ? 'text-[color:var(--color-saffron)]' :
    'text-[color:var(--color-muted)]';
  return (
    <Link
      href={href}
      className="rounded-[var(--radius-lg)] bg-[color:var(--color-surface)] border border-[color:var(--color-border)]/60 px-3 py-3 shadow-[var(--shadow-soft)] active:scale-[0.98] transition-transform"
    >
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-[color:var(--color-muted)] font-semibold">{label}</div>
      <div className={`mt-1 font-display text-[24px] leading-none ${toneClass}`}>{value}</div>
      {sub && <div className="mt-1 text-[10.5px] text-[color:var(--color-muted)]/80 truncate">{sub}</div>}
    </Link>
  );
}

function SectionCard({
  href,
  icon,
  title,
  body,
  highlight = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        'flex items-center gap-3 rounded-[var(--radius-xl)] px-4 py-3.5 shadow-[var(--shadow-soft)] active:scale-[0.99] transition-transform ' +
        (highlight
          ? 'bg-[color:var(--color-primary-soft)] border border-[color:var(--color-primary)]/30'
          : 'bg-[color:var(--color-surface)] border border-[color:var(--color-border)]/60')
      }
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)] shrink-0">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold tracking-tight">{title}</div>
        <div className="text-[12px] text-[color:var(--color-muted)] truncate">{body}</div>
      </div>
      <ChevronRight />
    </Link>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-[color:var(--color-muted)] shrink-0">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function IconOrders() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7l1 13h14l1-13" />
      <path d="M8 7V5a4 4 0 018 0v2" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s7-7.5 7-13a7 7 0 10-14 0c0 5.5 7 13 7 13z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}
function IconStar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l2.7 5.6 6.3.9-4.5 4.4 1.1 6.1L12 17.8 6.4 20l1.1-6.1L3 9.5l6.3-.9L12 3z" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 11-3.2-6.4L21 4l-1.3 3.5A7.97 7.97 0 0121 12z" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function IconStore() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l1-5h16l1 5" />
      <path d="M4 9v11h16V9" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
