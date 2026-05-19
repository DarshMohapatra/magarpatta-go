import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function VendorAppleIcon() {
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
              bottom: 12,
              left: 18,
              right: 18,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                background: '#0d4a2e',
                color: '#fcf6e8',
                fontSize: 14,
                letterSpacing: 2,
                padding: '3px 10px',
                borderRadius: 5,
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
