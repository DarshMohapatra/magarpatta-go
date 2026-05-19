import { ImageResponse } from 'next/og';

/**
 * Vendor PWA icon — forest green dominant with a saffron leaf and a "SHOP"
 * label so the home-screen icon is instantly identifiable next to the
 * customer + admin variants.
 */
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function VendorIcon() {
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
          <div
            style={{
              position: 'absolute',
              top: 28,
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
                background: '#0d4a2e',
                color: '#fcf6e8',
                fontSize: 36,
                letterSpacing: 6,
                padding: '8px 28px',
                borderRadius: 12,
                fontWeight: 700,
                display: 'flex',
              }}
            >
              SHOP
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
