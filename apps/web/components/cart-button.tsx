'use client';

import { useEffect, useState } from 'react';
import { useCart, cartCount } from '@/lib/cart';

export function CartButton() {
  const items = useCart((s) => s.items);
  const open = useCart((s) => s.openDrawer);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const count = mounted ? cartCount(items) : 0;

  return (
    <button
      onClick={open}
      className="relative inline-flex items-center gap-1.5 rounded-full bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)] px-3 py-1.5 sm:px-3.5 sm:py-2 text-[12.5px] font-semibold transition-colors hover:opacity-90"
      aria-label={`Cart — ${count} items`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M4 6h2l2 12h11M8 18a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4zM8 10h14l-1.5 7H10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Cart{count > 0 ? ` · ${count}` : ''}</span>
    </button>
  );
}
