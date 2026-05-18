import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site-config';

/**
 * Web App Manifest — Next.js emits this at /manifest.webmanifest and adds
 * the <link rel="manifest"> tag to every page from the root layout. Lets
 * customers "Install" (Chrome) or "Add to Home Screen" (iOS Safari) and
 * get a standalone-looking app icon backed by our existing Vercel deploy.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.platformName,
    short_name: siteConfig.platformName,
    description: siteConfig.tagline,
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#fbf8f3',
    theme_color: '#0d4a2e',
    categories: ['shopping', 'food', 'lifestyle'],
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
