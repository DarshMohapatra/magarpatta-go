import { redirect } from 'next/navigation';
import { getVendorSession } from '@/lib/vendor-session';
import { VendorShell } from '@/components/vendor/vendor-shell';
import { TodayClient } from './today-client';

export const dynamic = 'force-dynamic';

export default async function VendorTodayPage() {
  const s = await getVendorSession();
  if (!s) redirect('/vendor/signin');

  return (
    <VendorShell shopName={s.shopName} approvalStatus={s.approvalStatus}>
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Today's menu</div>
        <h1 className="mt-2 font-serif text-[36px] sm:text-[44px] leading-[1.02] tracking-[-0.02em]">
          Price &amp; stock for <span className="italic text-[color:var(--color-forest)]">today.</span>
        </h1>
        <p className="mt-3 text-[14px] text-[color:var(--color-ink-soft)] max-w-[640px]">
          Edits go live the moment you save. Leave a row alone and customers see
          yesterday's price or "in stock" status. Mark items out of stock and
          they vanish from the menu immediately.
        </p>
      </div>

      <TodayClient />
    </VendorShell>
  );
}
