import { ImageResponse } from 'next/og';

/**
 * Admin PWA icon — terracotta-accented variant of the customer mark.
 * Same composed scene (cream squircle, leaf, italic serif glyph) but
 * with the "Admin" badge baked in so it's instantly distinguishable on
 * the home screen from the customer app.
 */
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function AdminIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6b1e15 0%, #8a2a1e 50%, #c8552a 100%)',
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
            boxShadow: 'inset 0 -16px 32px rgba(106, 30, 21, 0.18)',
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
              color: '#6b1e15',
              letterSpacing: -10,
              fontWeight: 600,
              marginTop: 28,
              textShadow: '0 4px 12px rgba(106, 30, 21, 0.18)',
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
                background: '#6b1e15',
                color: '#fcf6e8',
                fontSize: 36,
                letterSpacing: 6,
                padding: '8px 28px',
                borderRadius: 12,
                fontWeight: 700,
                display: 'flex',
              }}
            >
              ADMIN
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
