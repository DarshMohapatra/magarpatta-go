import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/site-config';

/**
 * Apple touch icon — what iOS uses for "Add to Home Screen". Apple wants a
 * 180×180 PNG; if missing iOS falls back to a screenshot of the page which
 * looks bad. We serve a denser-rendered version of the brand glyph.
 */

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
            fontSize: 110,
            lineHeight: 1,
            letterSpacing: -6,
          }}
        >
          <span style={{ fontStyle: 'normal', fontWeight: 600 }}>{initial}</span>
          <span style={{ fontSize: 72, marginLeft: 2, color: '#f2c15a' }}>go</span>
        </div>
      </div>
    ),
    size,
  );
}
