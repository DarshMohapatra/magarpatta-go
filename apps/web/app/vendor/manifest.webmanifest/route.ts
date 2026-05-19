import { NextResponse } from 'next/server';
import { siteConfig } from '@/lib/site-config';

export function GET() {
  return NextResponse.json(
    {
      name: `${siteConfig.platformName} · Vendor`,
      short_name: `${siteConfig.platformName} Vendor`,
      description: 'Vendor workspace — manage today\'s menu, accept orders, mark them ready.',
      start_url: '/vendor/signin',
      scope: '/vendor',
      display: 'standalone',
      orientation: 'portrait-primary',
      background_color: '#fbf8f3',
      theme_color: '#0d4a2e',
      categories: ['business', 'food'],
      icons: [
        { src: '/vendor/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/vendor/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        { src: '/vendor/apple-icon', sizes: '180x180', type: 'image/png' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
}
