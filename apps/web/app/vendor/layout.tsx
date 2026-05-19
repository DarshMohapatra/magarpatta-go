import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { siteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: `${siteConfig.platformName} · Vendor`,
  description: `Vendor workspace for partner shops in ${siteConfig.siteName}.`,
  manifest: '/vendor/manifest.webmanifest',
  applicationName: `${siteConfig.platformName} Vendor`,
  appleWebApp: {
    capable: true,
    title: `${siteConfig.platformName} Vendor`,
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#0d4a2e',
  width: 'device-width',
  initialScale: 1,
};

export default function VendorLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[color:var(--color-cream)]">{children}</div>;
}
