'use client';

import { useEffect } from 'react';

interface Props {
  currentHub: string;
  nextHub: string;
  currentVendorName: string;
  nextVendorName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function VendorSwitchDialog({ currentHub, nextHub, currentVendorName, nextVendorName, onCancel, onConfirm }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-[80] bg-[color:var(--color-ink)]/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] rounded-2xl bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 shadow-[0_24px_70px_-20px_rgba(15,15,14,0.35)] overflow-hidden"
      >
        <div className="p-6">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">
            Different hub
          </div>
          <h2 className="mt-2 font-serif text-[24px] leading-tight text-[color:var(--color-ink)]">
            One trip, one hub.
          </h2>
          <p className="mt-3 text-[13.5px] leading-[1.55] text-[color:var(--color-ink-soft)]">
            Your cart is for <span className="font-medium text-[color:var(--color-ink)]">{currentHub}</span> ({currentVendorName}).
            To add from <span className="font-medium text-[color:var(--color-ink)]">{nextVendorName}</span> — which is in{' '}
            <span className="font-medium text-[color:var(--color-ink)]">{nextHub}</span> — we&apos;ll clear the current cart first.
            Orders can mix shops within the same hub, but a rider can&apos;t criss-cross hubs in one run.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 bg-[color:var(--color-cream)]/50 border-t border-[color:var(--color-ink)]/8">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-[13px] text-[color:var(--color-ink)] hover:bg-[color:var(--color-ink)]/5"
          >
            Keep {currentHub}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-full text-[13px] font-medium bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)]"
          >
            Clear & switch
          </button>
        </div>
      </div>
    </div>
  );
}
