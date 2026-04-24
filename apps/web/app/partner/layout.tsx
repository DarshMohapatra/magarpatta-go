import type { ReactNode } from 'react';

export const metadata = {
  title: 'Magarpatta Go · Partners',
  description: 'Join Magarpatta Go as a vendor, delivery partner, or operations admin.',
};

export default function PartnerLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[color:var(--color-cream)]">{children}</div>;
}
