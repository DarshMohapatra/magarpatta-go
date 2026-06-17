import { redirect } from 'next/navigation';
import { getSuperSession } from '@/lib/super-admin-session';
import { PartnerAuthShell } from '@/components/auth/partner-auth-shell';
import { SuperSignInClient } from './signin-client';

export const dynamic = 'force-dynamic';

export default async function SuperAdminSignInPage() {
  const session = await getSuperSession();
  if (session) redirect('/super-admin');

  return (
    <PartnerAuthShell
      surfaceLabel="Super admin"
      eyebrow="Cross-instance"
      title="Watch every site from one place."
      subtitle="Read-only overview across all townships. Different login from each site's own admin — supervises every site, writes to none."
    >
      <SuperSignInClient />
      <p className="mt-8 text-[11.5px] text-[color:var(--color-muted)]/60 text-center">
        Sessions expire after 8 hours.
      </p>
    </PartnerAuthShell>
  );
}
