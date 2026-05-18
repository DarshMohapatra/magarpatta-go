import { ImageResponse } from 'next/og';

/**
 * Brand icon — drawn as a small composed scene rather than just initials so
 * it reads as a real app icon at home-screen sizes. Layered serif "M" sits
 * inside a cream tile with a single saffron leaf cresting over it, framed
 * by a forest border that survives masking (Android adaptive icons crop
 * to a circle/squircle — keeping the artwork ≥ 20% inset preserves it).
 *
 * Acts as both the PWA manifest icon (512×512) and the desktop favicon.
 */

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
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
        {/* Cream squircle disc */}
        <div
          style={{
            width: 396,
            height: 396,
            borderRadius: 120,
            background: 'radial-gradient(circle at 30% 25%, #fcf6e8 0%, #f1e7c8 100%)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 -16px 32px rgba(15, 60, 35, 0.12)',
          }}
        >
          {/* Saffron leaf cresting top-right */}
          <div
            style={{
              position: 'absolute',
              top: 26,
              right: 36,
              width: 130,
              height: 130,
              borderRadius: '0 100% 0 100%',
              background: 'linear-gradient(135deg, #f2c15a 0%, #e08f2e 100%)',
              transform: 'rotate(-15deg)',
              boxShadow: '0 6px 16px rgba(216, 122, 38, 0.35)',
              display: 'flex',
            }}
          />
          {/* Leaf vein highlight */}
          <div
            style={{
              position: 'absolute',
              top: 50,
              right: 84,
              width: 4,
              height: 70,
              borderRadius: 8,
              background: 'rgba(255, 251, 235, 0.55)',
              transform: 'rotate(-15deg)',
              display: 'flex',
            }}
          />

          {/* The serif M — italic, forest, weighted */}
          <div
            style={{
              display: 'flex',
              fontFamily: 'serif',
              fontStyle: 'italic',
              fontSize: 340,
              lineHeight: 0.85,
              color: '#0d4a2e',
              letterSpacing: -10,
              fontWeight: 600,
              marginTop: 28,
              textShadow: '0 4px 12px rgba(13, 74, 46, 0.18)',
            }}
          >
            M
          </div>

          {/* Lower-left terracotta dot — secondary brand colour, balances the leaf */}
          <div
            style={{
              position: 'absolute',
              bottom: 56,
              left: 70,
              width: 24,
              height: 24,
              borderRadius: 12,
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
