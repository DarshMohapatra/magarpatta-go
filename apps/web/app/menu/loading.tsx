import { NavbarWithSession } from '@/components/navbar-with-session';

export default function MenuLoading() {
  return (
    <main className="relative z-10 min-h-screen">
      <NavbarWithSession />
      <section className="pt-24 pb-16">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
          <div className="h-12 w-72 rounded-md bg-[color:var(--color-ink)]/8 mb-3 animate-pulse" />
          <div className="h-4 w-96 rounded-full bg-[color:var(--color-ink)]/6 mb-10" />
          <div className="grid lg:grid-cols-[220px_1fr] gap-8 lg:gap-10">
            <aside className="hidden lg:block space-y-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 rounded-lg bg-[color:var(--color-ink)]/6 animate-pulse" />
              ))}
            </aside>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-paper)] overflow-hidden">
                  <div className="h-44 bg-[color:var(--color-ink)]/6 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-5 w-3/4 rounded-md bg-[color:var(--color-ink)]/8" />
                    <div className="h-3 w-1/2 rounded-full bg-[color:var(--color-ink)]/6" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
