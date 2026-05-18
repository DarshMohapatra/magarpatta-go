import { ImageResponse } from 'next/og';

/**
 * Apple touch icon — 180×180 mirror of app/icon.tsx with proportionally
 * tighter geometry so the artwork still reads at home-screen size on iOS.
 * iOS automatically rounds the corners, so the inner squircle here is
 * cosmetic, not load-bearing.
 */

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0d4a2e 0%, #1a5d3a 60%, #f2a83c 140%)',
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 42,
            background: 'radial-gradient(circle at 30% 25%, #fcf6e8 0%, #f1e7c8 100%)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 -6px 14px rgba(15, 60, 35, 0.12)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 12,
              width: 46,
              height: 46,
              borderRadius: '0 100% 0 100%',
              background: 'linear-gradient(135deg, #f2c15a 0%, #e08f2e 100%)',
              transform: 'rotate(-15deg)',
              display: 'flex',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 18,
              right: 30,
              width: 2,
              height: 25,
              borderRadius: 4,
              background: 'rgba(255, 251, 235, 0.55)',
              transform: 'rotate(-15deg)',
              display: 'flex',
            }}
          />
          <div
            style={{
              display: 'flex',
              fontFamily: 'serif',
              fontStyle: 'italic',
              fontSize: 120,
              lineHeight: 0.85,
              color: '#0d4a2e',
              letterSpacing: -4,
              fontWeight: 600,
              marginTop: 10,
            }}
          >
            M
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: 24,
              width: 9,
              height: 9,
              borderRadius: 5,
              background: '#c8552a',
              display: 'flex',
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
