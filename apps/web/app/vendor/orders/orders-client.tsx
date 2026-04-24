'use client';

import { useEffect, useState } from 'react';

interface OrderRow {
  id: string;
  status: string;
  placedAt: string;
  vendorAcceptedAt: string | null;
  vendorReadyAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  riderName: string | null;
  fulfilmentMode: 'PLATFORM_RIDER' | 'VENDOR_SELF';
  society: string;
  building: string;
  flat: string;
  subtotalInr: number;
  totalInr: number;
  items: Array<{ name: string; quantity: number; unit?: string | null }>;
}

interface Data {
  incoming: OrderRow[];
  preparing: OrderRow[];
  ready: OrderRow[];
  onTheWay: OrderRow[];
  history: OrderRow[];
  todaySalesInr: number;
  todayOrders: number;
}

export function VendorOrdersClient({ approvalStatus }: { approvalStatus: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const r = await fetch('/api/vendor/orders', { cache: 'no-store' });
      const j = await r.json();
      if (!j.ok) { setErr(j.error ?? 'Could not load orders'); return; }
      setData(j);
      setErr(null);
    } catch { setErr('Network error.'); }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  async function act(id: string, action: 'accept' | 'ready' | 'reject' | 'out-for-delivery' | 'delivered', payload?: Record<string, unknown>) {
    setBusy(id + ':' + action);
    try {
      const r = await fetch(`/api/vendor/orders/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const j = await r.json();
      if (!j.ok) { alert(j.error ?? 'Action failed'); return; }
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (approvalStatus !== 'APPROVED') {
    return (
      <div className="rounded-2xl border border-[color:var(--color-saffron)]/30 bg-[color:var(--color-saffron)]/8 p-6">
        <h2 className="font-serif text-[22px]">Orders go live after approval</h2>
        <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]">
          Once the Magarpatta Go team approves your shop, incoming orders will appear here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Live orders</div>
          <h1 className="mt-2 font-serif text-[32px] sm:text-[40px] leading-[1.02] tracking-[-0.02em]">
            The counter, <span className="italic text-[color:var(--color-forest)]">live.</span>
          </h1>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/70">Today</div>
          <div className="font-serif text-[22px] text-[color:var(--color-forest)]">₹{(data?.todaySalesInr ?? 0).toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-[color:var(--color-ink-soft)]/60">{data?.todayOrders ?? 0} delivered · auto-refresh 5s</div>
        </div>
      </div>

      {err && (
        <div className="rounded-xl bg-[color:var(--color-terracotta)]/10 border border-[color:var(--color-terracotta)]/25 px-4 py-3 text-[13px] text-[color:var(--color-terracotta-dark)]">
          {err}
        </div>
      )}

      <Section title="New · tap to accept" count={data?.incoming.length ?? 0} accent="saffron">
        {data?.incoming.map((o) => (
          <Card key={o.id} o={o} accent="saffron">
            <div className="mt-3 flex gap-2">
              <button
                disabled={busy === o.id + ':accept'}
                onClick={() => act(o.id, 'accept')}
                className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-4 py-2 text-[12.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50"
              >
                Accept
              </button>
              <button
                disabled={busy === o.id + ':reject'}
                onClick={() => {
                  const reason = prompt('Reason for rejecting? (customer will see this)');
                  if (reason === null) return;
                  act(o.id, 'reject', { reason });
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-terracotta)]/40 text-[color:var(--color-terracotta)] px-4 py-2 text-[12.5px] hover:bg-[color:var(--color-terracotta)]/8"
              >
                Reject
              </button>
            </div>
          </Card>
        ))}
      </Section>

      <Section title={data?.preparing.some((o) => o.fulfilmentMode === 'VENDOR_SELF') ? 'Preparing · mark ready, then set out' : 'Preparing · mark ready when food is boxed'} count={data?.preparing.length ?? 0}>
        {data?.preparing.map((o) => (
          <Card key={o.id} o={o}>
            <div className="mt-3 flex gap-2">
              <button
                disabled={busy === o.id + ':ready'}
                onClick={() => act(o.id, 'ready')}
                className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-saffron)] text-[color:var(--color-ink)] px-4 py-2 text-[12.5px] font-medium hover:brightness-95 disabled:opacity-50"
              >
                {o.fulfilmentMode === 'VENDOR_SELF' ? 'Mark ready (boxed)' : 'Ready for pickup'}
              </button>
              {o.fulfilmentMode === 'VENDOR_SELF' && (
                <button
                  disabled={busy === o.id + ':out-for-delivery'}
                  onClick={() => act(o.id, 'out-for-delivery')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-4 py-2 text-[12.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50"
                >
                  Head out now →
                </button>
              )}
            </div>
          </Card>
        ))}
      </Section>

      <Section title="Ready · waiting for pickup / leaving shop" count={data?.ready.length ?? 0}>
        {data?.ready.map((o) => (
          <Card key={o.id} o={o}>
            {o.fulfilmentMode === 'VENDOR_SELF' && (
              <div className="mt-3 flex gap-2">
                <button
                  disabled={busy === o.id + ':out-for-delivery'}
                  onClick={() => act(o.id, 'out-for-delivery')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-4 py-2 text-[12.5px] font-medium hover:bg-[color:var(--color-forest-dark)]"
                >
                  Head out now →
                </button>
              </div>
            )}
          </Card>
        ))}
      </Section>

      <Section title="Out for delivery" count={data?.onTheWay.length ?? 0}>
        {data?.onTheWay.map((o) => (
          <Card key={o.id} o={o}>
            {o.fulfilmentMode === 'VENDOR_SELF' && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    const otp = prompt('Ask the customer for their 4-digit OTP and type it here:');
                    if (!otp) return;
                    act(o.id, 'delivered', { otp });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-4 py-2 text-[12.5px] font-medium hover:bg-[color:var(--color-forest-dark)]"
                >
                  Mark delivered (OTP)
                </button>
              </div>
            )}
          </Card>
        ))}
      </Section>

      <Section title="Today's history" count={data?.history.length ?? 0}>
        {data?.history.map((o) => <Card key={o.id} o={o} muted />)}
      </Section>
    </div>
  );
}

function Section({ title, count, accent, children }: { title: string; count: number; accent?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-[22px]">{title}</h2>
        <span className={`text-[11px] uppercase tracking-[0.14em] ${accent === 'saffron' ? 'text-[color:var(--color-saffron)]' : 'text-[color:var(--color-ink-soft)]/70'}`}>
          {count}
        </span>
      </div>
      {count === 0 ? (
        <div className="rounded-xl border border-dashed border-[color:var(--color-ink)]/15 p-6 text-center text-[12.5px] text-[color:var(--color-ink-soft)]/70">
          Nothing here.
        </div>
      ) : (
        <ul className="grid gap-3">{children}</ul>
      )}
    </div>
  );
}

function Card({ o, accent, muted, children }: { o: OrderRow; accent?: string; muted?: boolean; children?: React.ReactNode }) {
  const placed = new Date(o.placedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const cls = accent === 'saffron'
    ? 'border-[color:var(--color-saffron)]/35 bg-[color:var(--color-saffron)]/5'
    : muted
      ? 'border-[color:var(--color-ink)]/8 bg-[color:var(--color-paper)]/70'
      : 'border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)]';
  return (
    <li className={`rounded-2xl border p-4 ${cls}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] flex-wrap">
            <span className={accent === 'saffron' ? 'text-[color:var(--color-saffron)]' : 'text-[color:var(--color-forest)]'}>
              {o.status.replace('_', ' ')}
            </span>
            <span className="text-[color:var(--color-ink-soft)]/50">· #{o.id.slice(-6)}</span>
            <span className="text-[color:var(--color-ink-soft)]/50">· {placed} IST</span>
            <span className={`rounded-full px-2 py-0.5 text-[9.5px] tracking-[0.14em] ${
              o.fulfilmentMode === 'VENDOR_SELF'
                ? 'bg-[color:var(--color-forest)]/12 text-[color:var(--color-forest)]'
                : 'bg-[color:var(--color-terracotta)]/10 text-[color:var(--color-terracotta)]'
            }`}>
              {o.fulfilmentMode === 'VENDOR_SELF' ? 'You deliver' : 'Rider pickup'}
            </span>
          </div>
          <div className="mt-1 font-medium text-[14.5px] truncate">
            → {o.building}, flat {o.flat}
            <span className="text-[color:var(--color-ink-soft)]/60"> · {o.society}</span>
          </div>
          <div className="text-[12.5px] text-[color:var(--color-ink-soft)]/80 truncate">
            {o.items.map((i) => `${i.name}${i.quantity > 1 ? ` × ${i.quantity}` : ''}${i.unit ? ` (${i.unit})` : ''}`).join(', ')}
          </div>
          {o.riderName && (
            <div className="mt-1 text-[11px] text-[color:var(--color-ink-soft)]/70">Rider · {o.riderName}</div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-serif text-[18px]">₹{o.subtotalInr}</div>
          <div className="text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/65">your share</div>
        </div>
      </div>
      {children}
    </li>
  );
}
