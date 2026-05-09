import type { Metadata } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import { siteConfig } from '@/lib/site-config';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${siteConfig.platformName} — Daily delights, delivered within your township`,
  description: `Food, groceries, medicines and more — sourced and delivered within ${siteConfig.siteName}, ${siteConfig.city}. Under 25 minutes. By neighbours, for neighbours.`,
  metadataBase: new URL('https://magarpatta-go.vercel.app'),
  openGraph: {
    title: siteConfig.platformName,
    description: `Hyper-local delivery, only inside ${siteConfig.siteName}.`,
    type: 'website',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable}`}>
      <body className="noise relative">{children}</body>
    </html>
  );
}
