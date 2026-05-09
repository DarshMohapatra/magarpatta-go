import type { ReactNode } from 'react';
import { siteConfig } from '@/lib/site-config';

export const metadata = {
  title: `${siteConfig.platformName} · Partners`,
  description: `Join ${siteConfig.platformName} as a vendor, delivery partner, or operations admin.`,
};

export default function PartnerLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[color:var(--color-cream)]">{children}</div>;
}
