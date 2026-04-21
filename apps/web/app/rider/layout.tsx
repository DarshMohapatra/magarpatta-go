import type { ReactNode } from 'react';

export const metadata = {
  title: 'Magarpatta Go · Rider',
  description: 'Rider app for Magarpatta Go neighbours on delivery duty.',
};

export default function RiderLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[color:var(--color-cream)]">{children}</div>;
}
