import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-session';
import { getAllSettings } from '@/lib/settings';
import { AdminShell } from '@/components/admin/admin-shell';
import { SettingsClient } from './settings-client';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');

  const settings = await getAllSettings();

  return (
    <AdminShell name={admin.name} role={admin.role}>
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Platform settings</div>
        <h1 className="mt-2 font-serif text-[36px] sm:text-[44px] leading-[1.02] tracking-[-0.02em]">
          Runtime <span className="italic text-[color:var(--color-forest)]">knobs.</span>
        </h1>
        <p className="mt-3 text-[14px] text-[color:var(--color-ink-soft)] max-w-[640px]">
          Edits here go live instantly — no redeploy. Every change is recorded
          in the activity log with your name attached.
        </p>
      </div>

      <SettingsClient
        initialDeliveryFeeInr={settings.delivery_fee_inr}
        initialSlots={settings.slot_definitions}
        initialWholesaleOnly={settings.wholesale_only_mode}
        initialNotice={settings.customer_notice}
        canEdit={admin.role === 'SUPER_ADMIN' || admin.role === 'OPS'}
      />
    </AdminShell>
  );
}
