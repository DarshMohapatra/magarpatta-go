import type { ReactNode } from 'react';
import { siteConfig } from '@/lib/site-config';

export const metadata = {
  title: `${siteConfig.platformName} · Admin`,
  description: `Operations console for ${siteConfig.platformName}.`,
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[color:var(--color-cream)]">{children}</div>;
}
