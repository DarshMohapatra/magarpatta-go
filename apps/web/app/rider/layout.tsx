import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: `${siteConfig.platformName} · Rider`,
  description: `Rider app for ${siteConfig.platformName} neighbours on delivery duty.`,
  manifest: '/rider/manifest.webmanifest',
  applicationName: `${siteConfig.platformName} Rider`,
  appleWebApp: {
    capable: true,
    title: `${siteConfig.platformName} Rider`,
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#d97935',
  width: 'device-width',
  initialScale: 1,
};

export default function RiderLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[color:var(--color-cream)]">{children}</div>;
}
