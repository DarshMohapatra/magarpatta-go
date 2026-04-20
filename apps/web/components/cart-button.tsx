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
      className="relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] text-[color:var(--color-ink)] hover:bg-[color:var(--color-ink)]/5 transition-colors"
      aria-label={`Cart — ${count} items`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M4 6h2l2 12h11M8 18a2 2 0 100 4 2 2 0 000-4zm10 0a2 2 0 100 4 2 2 0 000-4zM8 10h14l-1.5 7H10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="hidden sm:inline">Cart</span>
      {count > 0 && (
        <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[color:var(--color-saffron)] text-[color:var(--color-ink)] text-[10.5px] font-medium px-1">
          {count}
        </span>
      )}
    </button>
  );
}
