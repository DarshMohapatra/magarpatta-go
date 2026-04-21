'use client';

import { useEffect, useState } from 'react';

const ORDERS = [
  { who: 'Aashna', where: 'Cosmos',          what: 'Evening chai + samosa plate',  from: 'Kalika Sweets' },
  { who: 'Karan',  where: 'Iris',            what: 'Weekly grocery run',            from: 'Destination Centre' },
  { who: 'Meera',  where: 'Jasminium',       what: 'Paracetamol + Vicks',           from: 'Magarpatta Pharmacy' },
  { who: 'Rohan',  where: 'Daffodils',       what: 'Chicken breast, 500g',          from: 'Shraddha Meats' },
  { who: 'Sneha',  where: 'Laburnum Park',   what: 'Pad thai noodles',              from: 'Malaka Spice · Seasons' },
  { who: 'Vikram', where: 'Roystonea',       what: 'Tall cappuccino',               from: 'Starbucks · Seasons' },
  { who: 'Priya',  where: 'Trillium',        what: 'Milk, eggs, bread',             from: 'Destination Centre' },
  { who: 'Arjun',  where: 'Heliconia',       what: 'Hot jalebi, 250g',              from: 'Kalika Sweets' },
  { who: 'Neha',   where: 'Sylvania',        what: 'McSpicy + fries',               from: "McDonald's · Seasons" },
];

export function LiveOrders() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % ORDERS.length);
        setVisible(true);
      }, 280);
    }, 3400);
    return () => clearInterval(id);
  }, []);

  const o = ORDERS[idx];

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md px-4">
      <div
        className={`rounded-full border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)]/95 backdrop-blur-md shadow-[0_18px_40px_-18px_rgba(15,15,14,0.25)] transition-all duration-300 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--color-terracotta)] text-[color:var(--color-terracotta)] pulse-ring shrink-0" />
          <div className="flex-1 min-w-0 text-[12.5px] truncate">
            <span className="font-medium text-[color:var(--color-ink)]">{o.who}</span>
            <span className="text-[color:var(--color-ink-soft)]"> from </span>
            <span className="font-medium text-[color:var(--color-forest)]">{o.where}</span>
            <span className="text-[color:var(--color-ink-soft)]"> · {o.what}</span>
          </div>
          <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-ink-soft)]/60">
            live
          </span>
        </div>
      </div>
    </div>
  );
}
