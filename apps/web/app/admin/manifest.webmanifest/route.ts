import { NextResponse } from 'next/server';
import { siteConfig } from '@/lib/site-config';

/**
 * Admin PWA manifest. Served as a route handler (not via app/manifest.ts —
 * that file convention only works at the app root). The admin layout's
 * `metadata.manifest` points the browser here, so when an admin installs
 * from /admin in Chrome / Safari Add-to-Home-Screen, this manifest drives
 * the install: distinct icon, start_url, theme colour from the customer
 * and vendor variants.
 */
export function GET() {
  return NextResponse.json(
    {
      name: `${siteConfig.platformName} · Admin`,
      short_name: `${siteConfig.platformName} Admin`,
      description: 'Operations console — review vendors and riders, monitor live orders, run reports.',
      start_url: '/admin/signin',
      scope: '/admin',
      display: 'standalone',
      orientation: 'portrait-primary',
      background_color: '#fbf8f3',
      theme_color: '#6b1e15',
      categories: ['business', 'productivity'],
      icons: [
        { src: '/admin/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/admin/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        { src: '/admin/apple-icon', sizes: '180x180', type: 'image/png' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
}
