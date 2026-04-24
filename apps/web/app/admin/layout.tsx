import type { ReactNode } from 'react';

export const metadata = {
  title: 'Magarpatta Go · Admin',
  description: 'Operations console for Magarpatta Go.',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[color:var(--color-cream)]">{children}</div>;
}
