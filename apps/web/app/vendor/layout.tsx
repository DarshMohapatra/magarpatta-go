import type { ReactNode } from 'react';

export const metadata = {
  title: 'Magarpatta Go · Vendor',
  description: 'Vendor workspace for partner shops in Magarpatta City.',
};

export default function VendorLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[color:var(--color-cream)]">{children}</div>;
}
