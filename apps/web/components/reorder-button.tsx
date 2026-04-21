'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';

export interface ReorderItem {
  productId: string;
  name: string;
  vendorName: string;
  unit: string | null;
  priceInr: number;
  mrpInr: number | null;
  isRegulated: boolean;
  quantity: number;
  accent: string | null;
  glyph: string | null;
  imageUrl: string | null;
}

export function ReorderButton({
  items,
  variant = 'solid',
}: {
  items: ReorderItem[];
  variant?: 'solid' | 'outline';
}) {
  const router = useRouter();
  const cartAdd = useCart((s) => s.add);
  const [busy, setBusy] = useState(false);

  function go(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    for (const it of items) {
      for (let i = 0; i < it.quantity; i++) {
        cartAdd({
          id: it.productId,
          name: it.name,
          priceInr: it.priceInr,
          mrpInr: it.mrpInr ?? it.priceInr,
          isRegulated: it.isRegulated,
          unit: it.unit,
          accent: it.accent,
          glyph: it.glyph,
          imageUrl: it.imageUrl,
          vendorName: it.vendorName,
        });
      }
    }
    router.push('/checkout');
  }

  const base =
    'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-medium transition-colors shrink-0';
  const cls =
    variant === 'solid'
      ? `${base} bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)]`
      : `${base} border border-[color:var(--color-forest)]/40 bg-[color:var(--color-paper)] text-[color:var(--color-forest)] hover:bg-[color:var(--color-forest)] hover:text-[color:var(--color-cream)]`;

  return (
    <button onClick={go} disabled={busy} className={cls} title="Re-add these items to your cart">
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
        <path d="M11 4H3m0 0l3-3M3 4l3 3M3 10h8m0 0l-3-3m3 3l-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {busy ? 'Adding…' : 'Reorder'}
    </button>
  );
}
