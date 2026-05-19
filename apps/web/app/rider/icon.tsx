import { ImageResponse } from 'next/og';

/**
 * Rider PWA icon — saffron-dominant variant of the brand mark. "RIDE" label
 * across the bottom so the home-screen icon is easy to distinguish from
 * the customer, vendor and admin tiles.
 */
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function RiderIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #e08f2e 0%, #d97935 60%, #c8552a 100%)',
        }}
      >
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
            boxShadow: 'inset 0 -16px 32px rgba(180, 90, 30, 0.18)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 28,
              right: 36,
              width: 130,
              height: 130,
              borderRadius: '0 100% 0 100%',
              background: 'linear-gradient(135deg, #0d4a2e 0%, #1a5d3a 100%)',
              transform: 'rotate(-15deg)',
              boxShadow: '0 6px 16px rgba(13, 74, 46, 0.35)',
              display: 'flex',
            }}
          />
          <div
            style={{
              display: 'flex',
              fontFamily: 'serif',
              fontStyle: 'italic',
              fontSize: 340,
              lineHeight: 0.85,
              color: '#d97935',
              letterSpacing: -10,
              fontWeight: 600,
              marginTop: 28,
              textShadow: '0 4px 12px rgba(180, 90, 30, 0.18)',
            }}
          >
            M
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 38,
              left: 50,
              right: 50,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                background: '#d97935',
                color: '#fcf6e8',
                fontSize: 36,
                letterSpacing: 6,
                padding: '8px 28px',
                borderRadius: 12,
                fontWeight: 700,
                display: 'flex',
              }}
            >
              RIDE
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
