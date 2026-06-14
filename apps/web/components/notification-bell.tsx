'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Notification {
  id: string;
  kind: 'WEIGHT_RECONCILED' | 'ORDER_STATUS' | 'CAMPAIGN';
  title: string;
  body: string;
  orderId: string | null;
  readAt: string | null;
  createdAt: string;
}

interface Feed {
  ok: boolean;
  notifications: Notification[];
  unreadCount: number;
}

/**
 * Bell icon in the navbar. Polls /api/account/notifications every 60s for
 * the customer's recent feed + unread count. Tapping the bell opens a
 * dropdown listing the last 20; tapping a row marks it read and (when an
 * orderId is attached) navigates to the order page.
 *
 * Signed-out customers get a no-op (no bell, no requests) so we don't poll
 * for nothing on the marketing pages.
 */
export function NotificationBell({ signedIn }: { signedIn: boolean }) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch('/api/account/notifications', { cache: 'no-store' });
        const j = (await r.json()) as Feed;
        if (!cancelled) setFeed(j);
      } catch { /* silent — bell stays at the last good state */ }
    }
    load();
    const t = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [signedIn]);

  // Close dropdown when the user clicks anywhere else.
  useEffect(() => {
    if (!open) return;
    function onClick() { setOpen(false); }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [open]);

  async function markRead(id: string) {
    await fetch(`/api/account/notifications/${id}/read`, { method: 'POST' }).catch(() => {});
    setFeed((f) => f ? { ...f, notifications: f.notifications.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n), unreadCount: Math.max(0, f.unreadCount - 1) } : f);
  }

  if (!signedIn) return null;
  const unread = feed?.unreadCount ?? 0;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[color:var(--color-ink)]/5"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3.5 11.5h9l-1-1.5V7a3.5 3.5 0 10-7 0v3l-1 1.5zM6.5 13a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--color-terracotta)] text-[color:var(--color-cream)] text-[9.5px] font-semibold px-1">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[320px] sm:w-[360px] max-h-[420px] overflow-y-auto rounded-2xl bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/12 shadow-[0_20px_60px_-20px_rgba(15,15,14,0.3)] z-[80]">
          <div className="px-4 py-3 border-b border-[color:var(--color-ink)]/8 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">Notifications</span>
            {feed?.notifications.length ? (
              <span className="text-[11px] text-[color:var(--color-ink-soft)]/60">{feed.notifications.length}</span>
            ) : null}
          </div>
          {feed?.notifications.length === 0 ? (
            <div className="px-5 py-8 text-center text-[12.5px] text-[color:var(--color-ink-soft)]/70">
              You&apos;re all caught up.
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--color-ink)]/8">
              {feed?.notifications.map((n) => {
                const inner = (
                  <div className={`px-4 py-3 ${!n.readAt ? 'bg-[color:var(--color-forest)]/6' : ''}`}>
                    <div className="flex items-start gap-2.5">
                      {!n.readAt && (
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[color:var(--color-saffron)] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-[13.5px] text-[color:var(--color-ink)] leading-snug">
                          {n.title}
                        </div>
                        <div className="mt-1 text-[11.5px] text-[color:var(--color-ink-soft)]/85 whitespace-pre-line leading-snug line-clamp-4">
                          {n.body}
                        </div>
                        <div className="mt-1.5 text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/55">
                          {relativeTime(n.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.orderId ? (
                      <Link href={`/orders/${n.orderId}`} onClick={() => markRead(n.id)} className="block hover:bg-[color:var(--color-ink)]/3">
                        {inner}
                      </Link>
                    ) : (
                      <button type="button" onClick={() => markRead(n.id)} className="w-full text-left hover:bg-[color:var(--color-ink)]/3">
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
