'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * When the URL carries `?highlight=<productId>`, scroll that product into view
 * and pulse it briefly. Used by the shop page after a customer added the item
 * from the search/menu listing — visual confirmation of "yes, this is what you
 * just added; here is everything else this shop sells."
 */
export function HighlightOnMount() {
  const sp = useSearchParams();
  const highlight = sp?.get('highlight');

  useEffect(() => {
    if (!highlight) return;
    // Defer one frame so the suspended menu has a chance to paint.
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(`product-${highlight}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('mg-just-added');
      setTimeout(() => el.classList.remove('mg-just-added'), 2400);
    });
    return () => cancelAnimationFrame(raf);
  }, [highlight]);

  return null;
}
