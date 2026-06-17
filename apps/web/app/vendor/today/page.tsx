import { redirect } from 'next/navigation';
import { getVendorSession } from '@/lib/vendor-session';
import { VendorShell } from '@/components/vendor/vendor-shell';
import { PartnerPageHero } from '@/components/partner/partner-page-hero';
import { TodayClient } from './today-client';

export const dynamic = 'force-dynamic';

export default async function VendorTodayPage() {
  const s = await getVendorSession();
  if (!s) redirect('/vendor/signin');

  return (
    <VendorShell shopName={s.shopName} approvalStatus={s.approvalStatus}>
      <PartnerPageHero
        eyebrow="Today's menu"
        title="Price & stock for today."
        summary="Edits go live instantly · leave a row alone to keep yesterday's price"
      />
      <div>
        <p className="mt-5 text-[13px] text-[color:var(--color-muted)] max-w-[640px]">
          Edits go live the moment you save. Leave a row alone and customers see
          yesterday's price or "in stock" status. Mark items out of stock and
          they vanish from the menu immediately.
        </p>
      </div>

      <TodayClient />
    </VendorShell>
  );
}
