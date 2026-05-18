import { getCustomerNotice } from '@/lib/settings';

/**
 * Top-of-page banner shown to every customer when the admin has activated
 * a notice on /admin/settings. Server component — reads cached SiteSetting
 * once per request, costs ~nothing.
 */
export async function CustomerNoticeBanner() {
  const notice = await getCustomerNotice();
  if (!notice.active || !notice.message.trim()) return null;

  const cls =
    notice.level === 'alert'
      ? 'bg-[color:var(--color-terracotta)] text-[color:var(--color-cream)]'
      : notice.level === 'warning'
        ? 'bg-[color:var(--color-saffron)] text-[color:var(--color-ink)]'
        : 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)]';

  return (
    <div className={`${cls} fixed top-0 left-0 right-0 z-[80] px-4 py-2 text-[12.5px] text-center font-medium`}>
      {notice.message}
    </div>
  );
}
