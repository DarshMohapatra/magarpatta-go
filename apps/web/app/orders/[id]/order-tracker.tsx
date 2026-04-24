'use client';

import { useEffect, useState } from 'react';
import type { OrderStatus } from '@prisma/client';
import { STATUS_TIMELINE, statusLabel, statusProgress, riderIsMoving } from '@/lib/orders';
import { cn } from '@/lib/utils';

interface Stamps {
  placedAt?: string | null;
  vendorAcceptedAt?: string | null;
  vendorReadyAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
}

interface Props {
  status: OrderStatus;
  elapsedSeconds: number;
  vendorName?: string | null;
  society: string;
  building: string;
  flat: string;
  stamps?: Stamps;
  riderName?: string | null;
  fulfilmentMode?: 'PLATFORM_RIDER' | 'VENDOR_SELF' | 'PLATFORM_RIDER_CONCIERGE';
}

/**
 * Animated delivery tracker — Zomato/Swiggy-style bike rider moving from the
 * vendor shop to the customer's building along a curve on the Magarpatta
 * polygon. Rider appears during PICKED_UP + OUT_FOR_DELIVERY and smoothly
 * slides along the SVG path tied to statusProgress().
 */
export function OrderTracker({ status, elapsedSeconds, vendorName, society, building, flat, stamps, riderName, fulfilmentMode }: Props) {
  const vendorSelf = fulfilmentMode === 'VENDOR_SELF';
  const concierge = fulfilmentMode === 'PLATFORM_RIDER' || fulfilmentMode === 'PLATFORM_RIDER_CONCIERGE';
  // For concierge orders the vendor is never notified, so the "Vendor
  // accepted" and "Preparing" steps never happen — hide them from the
  // customer's timeline. Four steps instead of six.
  const timeline = concierge
    ? STATUS_TIMELINE.filter((s) => !['ACCEPTED', 'PREPARING'].includes(s.status))
    : STATUS_TIMELINE;
  const progress = statusProgress(status); // 0..1
  const moving = riderIsMoving(status);
  const delivered = status === 'DELIVERED';

  // Start (vendor) and end (customer) anchors on the SVG
  const SHOP = { x: 80,  y: 90  };
  const HOME = { x: 360, y: 230 };

  // Map progress onto the visible path: before PICKED_UP the rider hangs at
  // the shop; between PICKED_UP (0.6) and DELIVERED (1.0) it travels home.
  const pickedUpP = 3 / 5; // PICKED_UP is step 3 of 5 (index 3)
  const travelP = delivered ? 1 : moving ? Math.min(1, (progress - pickedUpP) / (1 - pickedUpP)) : 0;

  // Quadratic bezier: shop → control → home, so the rider follows an arc.
  const CTRL = { x: 220, y: 60 };
  function quadAt(t: number) {
    const x = (1 - t) * (1 - t) * SHOP.x + 2 * (1 - t) * t * CTRL.x + t * t * HOME.x;
    const y = (1 - t) * (1 - t) * SHOP.y + 2 * (1 - t) * t * CTRL.y + t * t * HOME.y;
    // tangent for rotation
    const dx = 2 * (1 - t) * (CTRL.x - SHOP.x) + 2 * t * (HOME.x - CTRL.x);
    const dy = 2 * (1 - t) * (CTRL.y - SHOP.y) + 2 * t * (HOME.y - CTRL.y);
    return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
  }

  const rider = delivered ? { x: HOME.x, y: HOME.y, angle: 0 } : quadAt(travelP);

  return (
    <div className="rounded-3xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden shadow-[0_24px_60px_-28px_rgba(15,15,14,0.18)]">
      {/* Map viewport */}
      <div className="relative h-[320px] bg-[color:var(--color-forest)]/5 overflow-hidden">
        <svg viewBox="0 0 440 320" className="absolute inset-0 w-full h-full">
          <defs>
            <radialGradient id="magarHalo" cx="50%" cy="55%" r="60%">
              <stop offset="0%" stopColor="var(--color-saffron)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--color-saffron)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="440" height="320" fill="url(#magarHalo)" />

          {/* Magarpatta polygon */}
          <path
            d="M50 80 L150 40 L310 45 L400 120 L390 240 L300 290 L140 285 L60 220 Z"
            stroke="var(--color-forest)"
            strokeWidth="1.2"
            strokeDasharray="3 4"
            fill="var(--color-forest)"
            fillOpacity="0.05"
          />

          {/* Route line from shop to home */}
          <path
            d={`M ${SHOP.x} ${SHOP.y} Q ${CTRL.x} ${CTRL.y} ${HOME.x} ${HOME.y}`}
            stroke="var(--color-ink)"
            strokeOpacity="0.15"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            fill="none"
          />
          {/* Travelled segment */}
          {moving && (
            <path
              d={`M ${SHOP.x} ${SHOP.y} Q ${CTRL.x} ${CTRL.y} ${HOME.x} ${HOME.y}`}
              stroke="var(--color-saffron)"
              strokeWidth="2"
              fill="none"
              strokeDasharray="500"
              strokeDashoffset={500 - 500 * travelP}
              style={{ transition: 'stroke-dashoffset 2s linear' }}
            />
          )}

          {/* Shop marker */}
          <g>
            <circle cx={SHOP.x} cy={SHOP.y} r="7" fill="var(--color-terracotta)" />
            <circle cx={SHOP.x} cy={SHOP.y} r="7" fill="var(--color-terracotta)" opacity="0.3">
              {!moving && !delivered && (
                <>
                  <animate attributeName="r" values="7;18;7" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0;0.3" dur="2.4s" repeatCount="indefinite" />
                </>
              )}
            </circle>
            <text x={SHOP.x} y={SHOP.y - 15} fontSize="10" textAnchor="middle" fill="var(--color-ink-soft)" className="uppercase tracking-wider">
              {vendorName?.split(' · ')[0] ?? 'Shop'}
            </text>
          </g>

          {/* Home marker */}
          <g>
            <circle cx={HOME.x} cy={HOME.y} r="7" fill="var(--color-forest)" />
            <circle cx={HOME.x} cy={HOME.y} r="7" fill="var(--color-forest)" opacity="0.3">
              {delivered && (
                <>
                  <animate attributeName="r" values="7;18;7" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0;0.3" dur="2.4s" repeatCount="indefinite" />
                </>
              )}
            </circle>
            <text x={HOME.x} y={HOME.y + 22} fontSize="10" textAnchor="middle" fill="var(--color-ink-soft)" className="uppercase tracking-wider">
              {building.split(' ').slice(-1)[0]} · {flat}
            </text>
          </g>

          {/* Rider / vendor courier — appears when moving or delivered */}
          {(moving || delivered) && !vendorSelf && (
            <g
              transform={`translate(${rider.x}, ${rider.y}) rotate(${rider.angle})`}
              style={{ transition: moving ? 'transform 2s linear' : 'none' }}
            >
              <ellipse cx="0" cy="8" rx="10" ry="2" fill="var(--color-ink)" fillOpacity="0.18" />
              <g transform="translate(-10, -8)">
                <circle cx="2" cy="4" r="3.5" fill="var(--color-ink)" />
                <circle cx="2" cy="4" r="1.5" fill="var(--color-saffron)" />
                <circle cx="18" cy="4" r="3.5" fill="var(--color-ink)" />
                <circle cx="18" cy="4" r="1.5" fill="var(--color-saffron)" />
                <rect x="4" y="1" width="12" height="6" rx="2" fill="var(--color-saffron)" stroke="var(--color-ink)" strokeWidth="0.6" />
                <line x1="18" y1="-2" x2="18" y2="2" stroke="var(--color-ink)" strokeWidth="0.8" strokeLinecap="round" />
                <circle cx="10" cy="1" r="2.5" fill="var(--color-forest)" />
                <circle cx="10" cy="0.5" r="1" fill="var(--color-cream)" />
                <rect x="5" y="8" width="7" height="5" rx="0.8" fill="var(--color-terracotta)" stroke="var(--color-ink)" strokeWidth="0.4" />
                <text x="8.5" y="11.5" fontSize="3" fill="var(--color-cream)" textAnchor="middle">MG</text>
              </g>
            </g>
          )}
          {(moving || delivered) && vendorSelf && (
            <g
              transform={`translate(${rider.x}, ${rider.y})`}
              style={{ transition: moving ? 'transform 2s linear' : 'none' }}
            >
              <ellipse cx="0" cy="7" rx="8" ry="1.8" fill="var(--color-ink)" fillOpacity="0.18" />
              {/* Vendor courier — stylised person carrying a tiffin/parcel */}
              <g transform="translate(-7, -10)">
                <circle cx="7" cy="2" r="2.5" fill="var(--color-forest)" />
                <rect x="4.5" y="5" width="5" height="7" rx="1.2" fill="var(--color-forest)" />
                <rect x="2" y="7" width="4" height="4" rx="0.6" fill="var(--color-terracotta)" stroke="var(--color-ink)" strokeWidth="0.4" />
                <text x="4" y="10" fontSize="2.4" fill="var(--color-cream)" textAnchor="middle">MG</text>
              </g>
            </g>
          )}
        </svg>

        {/* Floating time readout */}
        <div className="absolute top-4 left-4 rounded-full bg-[color:var(--color-paper)]/95 backdrop-blur px-3 py-1.5 flex items-center gap-1.5 border border-[color:var(--color-ink)]/10">
          <span className={cn(
            'relative inline-flex h-1.5 w-1.5 rounded-full',
            delivered ? 'bg-[color:var(--color-forest)]' : 'bg-[color:var(--color-saffron)] text-[color:var(--color-saffron)] pulse-ring',
          )} />
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]">
            {statusLabel(status)}
          </span>
        </div>

        <div className="absolute top-4 right-4 rounded-full bg-[color:var(--color-ink)] text-[color:var(--color-cream)] px-2.5 py-1 text-[10.5px] uppercase tracking-[0.12em]">
          {formatElapsed(elapsedSeconds)}
        </div>
      </div>

      {/* Timeline — horizontal steps */}
      <div className="px-6 py-6 border-t border-[color:var(--color-ink)]/8">
        <div className="flex items-center justify-between gap-2">
          {timeline.map((step, i) => {
            // Progress computed against the filtered timeline so concierge
            // orders reach "100%" when delivered, not 67%.
            const selfIdx = timeline.findIndex((s) => s.status === status);
            const done = selfIdx >= 0 ? i <= selfIdx : statusProgress(status) >= i / Math.max(1, timeline.length - 1);
            const current = step.status === status;
            const stampIso = stepStampIso(step.status, stamps);
            return (
              <div key={step.status} className="flex-1 flex items-center gap-2 min-w-0">
                <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium shrink-0 transition-colors',
                      done
                        ? current
                          ? 'bg-[color:var(--color-saffron)] text-[color:var(--color-ink)]'
                          : 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)]'
                        : 'bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink-soft)]/60',
                    )}
                  >
                    {done && !current ? (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px] uppercase tracking-[0.08em] text-center truncate max-w-full px-1',
                    current
                      ? 'text-[color:var(--color-ink)] font-medium'
                      : done
                        ? 'text-[color:var(--color-ink-soft)]'
                        : 'text-[color:var(--color-ink-soft)]/50',
                  )}>
                    {stepShortLabel(step.status)}
                  </span>
                  <span className={cn(
                    'text-[9.5px] font-mono tabular-nums tracking-tight text-center',
                    done ? 'text-[color:var(--color-ink-soft)]/70' : 'text-[color:var(--color-ink-soft)]/30',
                  )}>
                    {stampIso ? formatTimeIst(stampIso) : '—'}
                  </span>
                </div>
                {i < timeline.length - 1 && (
                  <div className={cn(
                    'h-px flex-1 shrink-0 transition-colors self-start mt-3',
                    done ? 'bg-[color:var(--color-forest)]/40' : 'bg-[color:var(--color-ink)]/12',
                  )} />
                )}
              </div>
            );
          })}
        </div>
        {(stamps?.pickedUpAt || riderName || concierge) && (
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-[color:var(--color-ink-soft)]/80">
            {vendorSelf && (
              <span className="rounded-full px-2 py-0.5 text-[9.5px] tracking-[0.14em] uppercase bg-[color:var(--color-forest)]/12 text-[color:var(--color-forest)]">
                Vendor-direct delivery
              </span>
            )}
            {concierge && (
              <span className="rounded-full px-2 py-0.5 text-[9.5px] tracking-[0.14em] uppercase bg-[color:var(--color-terracotta)]/12 text-[color:var(--color-terracotta)]">
                Personal shopper — walk-in pickup
              </span>
            )}
            {vendorSelf && vendorName && stamps?.vendorAcceptedAt && (
              <span><span className="text-[color:var(--color-ink-soft)]/55">Vendor</span> · {vendorName.split(' · ')[0]} accepted at {formatTimeIst(stamps.vendorAcceptedAt)}</span>
            )}
            {concierge && riderName && stamps?.pickedUpAt && (
              <span><span className="text-[color:var(--color-ink-soft)]/55">Rider</span> · {riderName} collected from {vendorName?.split(' · ')[0] ?? 'the shop'} at {formatTimeIst(stamps.pickedUpAt)}</span>
            )}
            {vendorSelf && stamps?.pickedUpAt && (
              <span><span className="text-[color:var(--color-ink-soft)]/55">On the way</span> · {vendorName?.split(' · ')[0]} left at {formatTimeIst(stamps.pickedUpAt)}</span>
            )}
            {stamps?.deliveredAt && (
              <span><span className="text-[color:var(--color-ink-soft)]/55">Delivered</span> · {formatTimeIst(stamps.deliveredAt)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function stepStampIso(s: OrderStatus, stamps?: Stamps): string | null | undefined {
  if (!stamps) return null;
  switch (s) {
    case 'PLACED': return stamps.placedAt;
    case 'ACCEPTED': return stamps.vendorAcceptedAt;
    case 'PREPARING': return stamps.vendorReadyAt;
    case 'PICKED_UP': return stamps.pickedUpAt;
    case 'OUT_FOR_DELIVERY': return stamps.pickedUpAt;
    case 'DELIVERED': return stamps.deliveredAt;
    default: return null;
  }
}

function formatTimeIst(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  });
}

function stepShortLabel(s: OrderStatus): string {
  switch (s) {
    case 'PLACED': return 'Placed';
    case 'ACCEPTED': return 'Accepted';
    case 'PREPARING': return 'Preparing';
    case 'PICKED_UP': return 'Picked up';
    case 'OUT_FOR_DELIVERY': return 'On the way';
    case 'DELIVERED': return 'Delivered';
    case 'CANCELLED': return 'Cancelled';
  }
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

/** Custom hook — polls /api/orders/[id] every 3s until the order reaches a
 * terminal state (DELIVERED / CANCELLED), then stops polling so the elapsed
 * counter freezes at the delivery moment.
 */
export interface LiveOrderState {
  status: OrderStatus;
  elapsedSeconds: number;
  riderName: string | null;
  stamps: Stamps;
}

export function useLiveOrder(id: string, initial: LiveOrderState) {
  const [state, setState] = useState(initial);

  useEffect(() => {
    if (state.status === 'DELIVERED' || state.status === 'CANCELLED') return;

    let cancelled = false;
    let handle: ReturnType<typeof setInterval> | null = null;
    async function tick() {
      try {
        const res = await fetch(`/api/orders/${id}`, { cache: 'no-store' });
        const data = await res.json();
        if (cancelled || !data.ok) return;
        setState({
          status: data.order.status,
          elapsedSeconds: data.order.elapsedSeconds,
          riderName: data.order.riderName ?? null,
          stamps: {
            placedAt: data.order.placedAt,
            vendorAcceptedAt: data.order.vendorAcceptedAt,
            vendorReadyAt: data.order.vendorReadyAt,
            pickedUpAt: data.order.pickedUpAt,
            deliveredAt: data.order.deliveredAt,
          },
        });
        if (data.order.status === 'DELIVERED' || data.order.status === 'CANCELLED') {
          if (handle) clearInterval(handle);
        }
      } catch {
        /* ignore */
      }
    }
    handle = setInterval(tick, 3000);
    tick();
    return () => {
      cancelled = true;
      if (handle) clearInterval(handle);
    };
  }, [id, state.status]);

  return state;
}
