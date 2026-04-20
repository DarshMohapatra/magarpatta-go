interface Props {
  glyph?: string | null;
  accent?: string | null;
  size?: number;
}

const GLYPHS: Record<string, (color: string) => React.ReactNode> = {
  sweet: (c) => (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" style={{ color: c, opacity: 0.85 }}>
      <path d="M32 8c3 5 8 7 8 14a8 8 0 0 1-16 0c0-5 2-7 4-11 1 2 2 3 3 5 0-3 1-5 1-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M20 36c-3 2-4 6-4 10 0 6 6 10 16 10s16-4 16-10c0-4-1-8-4-10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="26" cy="46" r="1.5" fill="currentColor"/>
      <circle cx="38" cy="48" r="1.5" fill="currentColor"/>
    </svg>
  ),
  leaf: (c) => (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" style={{ color: c, opacity: 0.85 }}>
      <path d="M14 48c6 4 20 4 28-4s10-22 10-30c-10 0-22 2-30 10s-12 18-8 24z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M14 48L46 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  drop: (c) => (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" style={{ color: c, opacity: 0.85 }}>
      <path d="M32 8C22 22 18 30 18 38a14 14 0 0 0 28 0c0-8-4-16-14-30z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M24 38c0 5 3 8 8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  grain: (c) => (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" style={{ color: c, opacity: 0.85 }}>
      <path d="M32 8v48M24 16c4 0 8 2 8 8M40 16c-4 0-8 2-8 8M22 26c5 0 10 3 10 9M42 26c-5 0-10 3-10 9M24 38c4 0 8 2 8 8M40 38c-4 0-8 2-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  loaf: (c) => (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" style={{ color: c, opacity: 0.85 }}>
      <path d="M12 36c0-10 8-18 20-18s20 8 20 18v6c0 2-2 4-4 4H16c-2 0-4-2-4-4v-6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M20 30c2-1 3-1 5 0M28 28c2-1 3-1 5 0M36 30c2-1 3-1 5 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  cut: (c) => (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" style={{ color: c, opacity: 0.85 }}>
      <path d="M16 20c8-8 24-8 32 0s8 24 0 32-24 8-32 0-8-24 0-32z" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M24 28l16 16M40 28L24 44" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  pill: (c) => (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" style={{ color: c, opacity: 0.85 }}>
      <rect x="10" y="24" width="44" height="16" rx="8" stroke="currentColor" strokeWidth="1.4"/>
      <line x1="32" y1="24" x2="32" y2="40" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  cup: (c) => (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" style={{ color: c, opacity: 0.85 }}>
      <path d="M16 20h28l-4 28a6 6 0 0 1-6 6h-8a6 6 0 0 1-6-6l-4-28z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M44 28h4a4 4 0 0 1 0 8h-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M24 12c0 2 2 2 2 4s-2 2-2 4M32 12c0 2 2 2 2 4s-2 2-2 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  box: (c) => (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" style={{ color: c, opacity: 0.85 }}>
      <path d="M12 20l20-10 20 10v24L32 54 12 44V20z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M12 20l20 10 20-10M32 30v24" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
};

const COLOR_MAP: Record<string, string> = {
  saffron: 'var(--color-saffron)',
  forest: 'var(--color-forest)',
  terracotta: 'var(--color-terracotta)',
  sage: 'var(--color-sage)',
};

export function ProductGlyph({ glyph, accent }: Props) {
  const color = COLOR_MAP[accent ?? 'forest'] ?? COLOR_MAP.forest;
  const render = GLYPHS[glyph ?? 'box'] ?? GLYPHS.box;
  return <>{render(color)}</>;
}
