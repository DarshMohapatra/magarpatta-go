import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/site-config';

/**
 * Admin PWA — installs separately from the customer app. When an admin
 * picks "Install" from /admin in Chrome (or Add to Home Screen from
 * /admin/signin in Safari), the OS reads THIS manifest (because the
 * admin layout's metadata.manifest points to it) and creates an icon
 * that launches straight into /admin/signin.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.platformName} · Admin`,
    short_name: `${siteConfig.platformName} Admin`,
    description: 'Operations console — review vendors and riders, monitor live orders, run reports.',
    start_url: '/admin/signin',
    scope: '/admin',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#fbf8f3',
    theme_color: '#c8552a', // terracotta — admin's accent across the codebase
    categories: ['business', 'productivity'],
    icons: [
      { src: '/admin/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/admin/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/admin/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
