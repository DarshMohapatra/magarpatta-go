'use client';

import { useEffect, useState } from 'react';

interface Row {
  id: string;
  actorRole: 'VENDOR' | 'RIDER' | 'CURATOR' | 'ADMIN' | 'CUSTOMER';
  actorId: string | null;
  actorName: string;
  action: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const ROLES: Array<{ key: string; label: string }> = [
  { key: '', label: 'Everyone' },
  { key: 'VENDOR', label: 'Vendors' },
  { key: 'RIDER', label: 'Riders' },
  { key: 'CURATOR', label: 'Curators' },
  { key: 'ADMIN', label: 'Admins' },
  { key: 'CUSTOMER', label: 'Customers' },
];

const ROLE_TONE: Record<string, string> = {
  VENDOR: 'bg-[color:var(--color-saffron)]/15 text-[color:var(--color-saffron)]',
  RIDER: 'bg-[color:var(--color-forest)]/12 text-[color:var(--color-forest)]',
  CURATOR: 'bg-[color:var(--color-gold)]/18 text-[color:var(--color-gold)]',
  ADMIN: 'bg-[color:var(--color-terracotta)]/12 text-[color:var(--color-terracotta)]',
  CUSTOMER: 'bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink-soft)]',
};

export function AdminActivityClient({ initialRole }: { initialRole: string }) {
  const [role, setRole] = useState(initialRole);
  const [actor, setActor] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [perRole, setPerRole] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (role) params.set('role', role);
      if (actor.trim()) params.set('actor', actor.trim());
      const r = await fetch(`/api/admin/activity?${params.toString()}`, { cache: 'no-store' });
      const j = await r.json();
      if (j.ok) {
        setRows(j.rows);
        setPerRole(j.perRole);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Activity feed</div>
        <h1 className="mt-2 font-serif text-[36px] sm:text-[44px] leading-[1.02] tracking-[-0.02em]">
          Who did what, <span className="italic text-[color:var(--color-forest)]">when.</span>
        </h1>
        <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)] max-w-xl">
          Cross-portal audit trail — every meaningful action by vendors, riders, curators, and admins. Operational fluff (page views, OTP fetches) is excluded.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRole(r.key)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] border ${
              role === r.key
                ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-[color:var(--color-forest)]'
                : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink-soft)] border-[color:var(--color-ink)]/12 hover:text-[color:var(--color-forest)]'
            }`}
          >
            {r.label} <span className="ml-1.5 opacity-70">{r.key === '' ? Object.values(perRole).reduce((a, b) => a + b, 0) : (perRole[r.key] ?? 0)}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
          placeholder="Filter by name (e.g. Kalika Sweets, Aman)…"
          className="flex-1 rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-3 py-2 text-[13px] outline-none focus:border-[color:var(--color-forest)]"
        />
        <button
          onClick={load}
          className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-4 py-2 text-[12.5px] font-medium hover:bg-[color:var(--color-forest-dark)]"
        >Search</button>
      </div>

      <ul className="mt-6 divide-y divide-[color:var(--color-ink)]/8 rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden">
        {loading && rows.length === 0 && (
          <li className="px-6 py-10 text-center text-[13px] text-[color:var(--color-ink-soft)]/70">Loading…</li>
        )}
        {!loading && rows.length === 0 && (
          <li className="px-6 py-10 text-center text-[13px] text-[color:var(--color-ink-soft)]/70">Nothing matching this filter.</li>
        )}
        {rows.map((r) => (
          <li key={r.id} className="px-5 py-3">
            <div className="flex items-start gap-3 flex-wrap">
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] ${ROLE_TONE[r.actorRole] ?? ROLE_TONE.CUSTOMER}`}>
                {r.actorRole.toLowerCase()}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-[color:var(--color-ink)]">{r.summary}</div>
                <div className="text-[10.5px] tracking-wide text-[color:var(--color-ink-soft)]/65 mt-0.5">
                  {r.action} · {r.actorName}
                </div>
              </div>
              <span className="shrink-0 text-[11px] text-[color:var(--color-ink-soft)]/60">
                {new Date(r.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
