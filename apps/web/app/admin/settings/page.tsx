import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin-session';
import { getAllSettings } from '@/lib/settings';
import { prisma } from '@/lib/prisma';
import { AdminShell } from '@/components/admin/admin-shell';
import { PartnerPageHero } from '@/components/partner/partner-page-hero';
import { SettingsClient } from './settings-client';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/signin');

  const [settings, categories] = await Promise.all([
    getAllSettings(),
    prisma.category.findMany({
      orderBy: { order: 'asc' },
      select: { slug: true, name: true },
    }),
  ]);

  return (
    <AdminShell name={admin.name} role={admin.role}>
      <PartnerPageHero
        eyebrow="Platform settings"
        title="Runtime knobs."
        summary="Edits go live instantly · every change logged with your name"
      />
      <div>
        <p className="mt-5 text-[13px] text-[color:var(--color-muted)] max-w-[640px]">
          Edits here go live instantly — no redeploy. Every change is recorded
          in the activity log with your name attached.
        </p>
      </div>

      <SettingsClient
        initialDeliveryFeeInr={settings.delivery_fee_inr}
        initialSlots={settings.slot_definitions}
        initialWholesaleOnly={settings.wholesale_only_mode}
        initialNotice={settings.customer_notice}
        initialAllowedCategories={settings.catalog_allowed_categories}
        initialSlotBypassEnabled={settings.slot_bypass_enabled}
        initialSlotBypassThresholdInr={settings.slot_bypass_threshold_inr}
        initialSlotMinCutoffMinutes={settings.slot_min_cutoff_minutes}
        allCategories={categories}
        canEdit={admin.role === 'SUPER_ADMIN' || admin.role === 'OPS'}
      />
    </AdminShell>
  );
}
