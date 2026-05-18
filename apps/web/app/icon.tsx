import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/site-config';

/**
 * Dynamically-generated brand icon. Acts as the high-resolution PWA icon
 * (referenced from app/manifest.ts) AND the favicon for desktop browsers.
 * The wordmark glyph is rendered server-side via ImageResponse so we don't
 * need to ship a static PNG file.
 */

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  const initial = siteConfig.wordmarkRoot.charAt(0).toUpperCase();
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0d4a2e 0%, #1f6a47 100%)',
          color: '#fbf8f3',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            fontFamily: 'serif',
            fontStyle: 'italic',
            fontSize: 310,
            lineHeight: 1,
            letterSpacing: -16,
            fontWeight: 400,
          }}
        >
          <span style={{ fontStyle: 'normal', fontWeight: 600 }}>{initial}</span>
          <span style={{ fontSize: 200, marginLeft: 6, color: '#f2c15a' }}>go</span>
        </div>
      </div>
    ),
    size,
  );
}
