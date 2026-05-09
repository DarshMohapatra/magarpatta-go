import type { ReactNode } from 'react';
import { siteConfig } from '@/lib/site-config';

export const metadata = {
  title: `${siteConfig.platformName} · Vendor`,
  description: `Vendor workspace for partner shops in ${siteConfig.siteName}.`,
};

export default function VendorLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[color:var(--color-cream)]">{children}</div>;
}
