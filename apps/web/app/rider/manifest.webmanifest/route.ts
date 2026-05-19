import { NextResponse } from 'next/server';
import { siteConfig } from '@/lib/site-config';

export function GET() {
  return NextResponse.json(
    {
      name: `${siteConfig.platformName} · Rider`,
      short_name: `${siteConfig.platformName} Rider`,
      description: 'Rider app — see your assigned drops, navigate, mark them delivered.',
      start_url: '/rider/signin',
      scope: '/rider',
      display: 'standalone',
      orientation: 'portrait-primary',
      background_color: '#fbf8f3',
      theme_color: '#d97935',
      categories: ['business', 'navigation'],
      icons: [
        { src: '/rider/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/rider/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        { src: '/rider/apple-icon', sizes: '180x180', type: 'image/png' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
}
