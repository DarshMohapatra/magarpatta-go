import type { ReactNode } from 'react';
import { siteConfig } from '@/lib/site-config';

export const metadata = {
  title: `${siteConfig.platformName} · Rider`,
  description: `Rider app for ${siteConfig.platformName} neighbours on delivery duty.`,
};

export default function RiderLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[color:var(--color-cream)]">{children}</div>;
}
