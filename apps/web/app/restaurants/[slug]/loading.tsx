import { NavbarWithSession } from '@/components/navbar-with-session';

export default function RestaurantLoading() {
  return (
    <main className="relative z-10 min-h-screen">
      <NavbarWithSession />
      <section className="pt-24 pb-10 bg-gradient-to-br from-[color:var(--color-forest)]/12 to-[color:var(--color-forest)]/4 border-b border-[color:var(--color-ink)]/8">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="h-3 w-24 rounded-full bg-[color:var(--color-ink)]/10 mb-6" />
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="h-3 w-16 rounded-full bg-[color:var(--color-ink)]/10" />
              <div className="h-12 sm:h-14 w-72 rounded-lg bg-[color:var(--color-ink)]/10" />
              <div className="h-4 w-80 rounded-full bg-[color:var(--color-ink)]/8" />
            </div>
            <div className="flex sm:flex-col gap-3">
              <div className="h-10 w-20 rounded-md bg-[color:var(--color-ink)]/8" />
              <div className="h-10 w-20 rounded-md bg-[color:var(--color-ink)]/8" />
            </div>
          </div>
        </div>
      </section>
      <section className="py-12">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="h-7 w-40 rounded-md bg-[color:var(--color-ink)]/10 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-2xl border border-[color:var(--color-ink)]/8 bg-[color:var(--color-paper)] overflow-hidden">
                <div className="h-44 bg-[color:var(--color-ink)]/6" />
                <div className="p-4 space-y-2">
                  <div className="h-5 w-3/4 rounded-md bg-[color:var(--color-ink)]/8" />
                  <div className="h-3 w-1/2 rounded-full bg-[color:var(--color-ink)]/6" />
                  <div className="mt-3 flex items-center justify-between">
                    <div className="h-6 w-16 rounded-md bg-[color:var(--color-ink)]/8" />
                    <div className="h-9 w-20 rounded-full bg-[color:var(--color-ink)]/8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
