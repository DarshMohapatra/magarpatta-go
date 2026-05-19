import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: `${siteConfig.platformName} · Admin`,
  description: `Operations console for ${siteConfig.platformName}.`,
  manifest: '/admin/manifest.webmanifest',
  applicationName: `${siteConfig.platformName} Admin`,
  appleWebApp: {
    capable: true,
    title: `${siteConfig.platformName} Admin`,
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#6b1e15',
  width: 'device-width',
  initialScale: 1,
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[color:var(--color-cream)]">{children}</div>;
}
