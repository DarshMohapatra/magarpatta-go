import Link from 'next/link';

export function PartnerNav() {
  return (
    <header className="absolute top-0 inset-x-0 z-10">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 py-5 flex items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[color:var(--color-saffron)] pulse-ring" />
          <span className="text-[14px] tracking-tight font-medium">
            Magarpatta <span className="font-serif italic text-[color:var(--color-forest)]">Go</span>
          </span>
        </Link>
        <nav className="flex items-center gap-5 text-[12.5px]">
          <Link href="/partner/vendor" className="text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)]">Vendors</Link>
          <Link href="/partner/rider" className="text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)]">Riders</Link>
          <Link href="/partner/admin" className="text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-forest)]">Admin</Link>
          <Link href="/" className="text-[color:var(--color-forest)] hover:underline">← Customer site</Link>
        </nav>
      </div>
    </header>
  );
}
