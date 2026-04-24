'use client';

import { useEffect, useState } from 'react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  priceInr: number;
  mrpInr: number | null;
  unit: string | null;
  isVeg: boolean;
  isRegulated: boolean;
  inStock: boolean;
  imageUrl: string | null;
  accent: string | null;
  glyph: string | null;
  category: { slug: string; name: string };
}

interface Category {
  id: string;
  slug: string;
  name: string;
  glyph: string | null;
}

const ACCENTS = ['forest', 'saffron', 'terracotta', 'gold'];
const GLYPHS = ['leaf', 'sweet', 'drop', 'grain', 'loaf', 'cut', 'pill', 'cup', 'box'];

const EMPTY: FormState = {
  name: '', description: '', categorySlug: '', mrpInr: '', priceInr: '',
  isRegulated: false, isVeg: true, unit: '', imageUrl: '', accent: 'forest', glyph: 'leaf',
};

interface FormState {
  name: string;
  description: string;
  categorySlug: string;
  mrpInr: string;
  priceInr: string;
  isRegulated: boolean;
  isVeg: boolean;
  unit: string;
  imageUrl: string;
  accent: string;
  glyph: string;
}

export function VendorMenuClient({ approvalStatus }: { approvalStatus: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const r = await fetch('/api/vendor/products', { cache: 'no-store' });
      const j = await r.json();
      if (!j.ok) { setErr(j.error ?? 'Could not load'); return; }
      setProducts(j.products);
      setCategories(j.categories);
      if (!form.categorySlug && j.categories.length) {
        setForm((f) => ({ ...f, categorySlug: j.categories[0].slug }));
      }
      setErr(null);
    } catch { setErr('Network error.'); }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleStock(p: Product, inStock: boolean) {
    await fetch(`/api/vendor/products/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inStock }),
    });
    load();
  }

  function openNew() {
    setEditingId(null);
    setForm({ ...EMPTY, categorySlug: categories[0]?.slug ?? '' });
    setDrawerOpen(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? '',
      categorySlug: p.category.slug,
      mrpInr: String(p.mrpInr ?? p.priceInr),
      priceInr: String(p.priceInr),
      isRegulated: p.isRegulated,
      isVeg: p.isVeg,
      unit: p.unit ?? '',
      imageUrl: p.imageUrl ?? '',
      accent: p.accent ?? 'forest',
      glyph: p.glyph ?? 'leaf',
    });
    setDrawerOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        name: form.name,
        description: form.description,
        categorySlug: form.categorySlug,
        mrpInr: Number(form.mrpInr),
        priceInr: form.isRegulated ? Number(form.mrpInr) : Number(form.priceInr || Number(form.mrpInr) + 1),
        isRegulated: form.isRegulated,
        isVeg: form.isVeg,
        unit: form.unit,
        imageUrl: form.imageUrl,
        accent: form.accent,
        glyph: form.glyph,
      };
      const url = editingId ? `/api/vendor/products/${editingId}` : '/api/vendor/products';
      const method = editingId ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!j.ok) { alert(j.error ?? 'Could not save'); setSaving(false); return; }
      setDrawerOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Product) {
    if (!confirm(`Remove "${p.name}"? It will stop appearing to customers.`)) return;
    await fetch(`/api/vendor/products/${p.id}`, { method: 'DELETE' });
    load();
  }

  if (approvalStatus !== 'APPROVED') {
    return (
      <div className="rounded-2xl border border-[color:var(--color-saffron)]/30 bg-[color:var(--color-saffron)]/8 p-6">
        <h2 className="font-serif text-[22px]">Menu editing unlocks after approval</h2>
        <p className="mt-2 text-[13px] text-[color:var(--color-ink-soft)]">
          You can prepare your menu once your shop is approved by Magarpatta Go.
        </p>
      </div>
    );
  }

  const byCategory = new Map<string, Product[]>();
  for (const p of products) {
    const k = p.category.name;
    if (!byCategory.has(k)) byCategory.set(k, []);
    byCategory.get(k)!.push(p);
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Menu</div>
          <h1 className="mt-2 font-serif text-[32px] sm:text-[40px] leading-[1.02] tracking-[-0.02em]">
            {products.length} item{products.length === 1 ? '' : 's'} on the <span className="italic text-[color:var(--color-forest)]">counter.</span>
          </h1>
          <p className="mt-2 text-[12.5px] text-[color:var(--color-ink-soft)]">
            Regulated MRP goods sell at MRP. Prepared / loose items add ₹1 hyper-local markup automatically.
          </p>
        </div>
        <button onClick={openNew} className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2.5 text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)]">
          + Add item
        </button>
      </div>

      {err && <div className="mt-4 rounded-xl bg-[color:var(--color-terracotta)]/10 border border-[color:var(--color-terracotta)]/25 px-4 py-3 text-[13px] text-[color:var(--color-terracotta-dark)]">{err}</div>}

      <div className="mt-8 space-y-8">
        {[...byCategory.entries()].map(([cat, items]) => (
          <section key={cat}>
            <h2 className="font-serif text-[20px] mb-3">{cat}</h2>
            <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden">
              <ul className="divide-y divide-[color:var(--color-ink)]/8">
                {items.map((p) => (
                  <li key={p.id} className="px-4 sm:px-5 py-3.5 flex items-center gap-4">
                    <div className={`h-3 w-3 rounded-sm border ${p.isVeg ? 'border-[color:var(--color-forest)]' : 'border-[color:var(--color-terracotta)]'}`}>
                      <div className={`h-1 w-1 m-[3px] rounded-full ${p.isVeg ? 'bg-[color:var(--color-forest)]' : 'bg-[color:var(--color-terracotta)]'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[14.5px] truncate">{p.name}</div>
                      <div className="text-[11.5px] text-[color:var(--color-ink-soft)]/70 truncate">
                        {p.unit && <span>{p.unit} · </span>}
                        {p.isRegulated ? 'MRP' : '+₹1 markup'}
                        {p.description && <span> · {p.description}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="font-serif text-[15px]">₹{p.priceInr}</div>
                      {p.mrpInr && p.mrpInr !== p.priceInr && (
                        <div className="text-[10.5px] text-[color:var(--color-ink-soft)]/60 line-through">₹{p.mrpInr}</div>
                      )}
                    </div>
                    <label className="inline-flex items-center gap-2 text-[11.5px] shrink-0">
                      <input type="checkbox" checked={p.inStock} onChange={(e) => toggleStock(p, e.target.checked)} className="accent-[color:var(--color-forest)]" />
                      <span className={p.inStock ? 'text-[color:var(--color-forest)]' : 'text-[color:var(--color-ink-soft)]/60'}>
                        {p.inStock ? 'In stock' : 'Out'}
                      </span>
                    </label>
                    <button onClick={() => openEdit(p)} className="text-[12px] text-[color:var(--color-forest)] hover:underline shrink-0">Edit</button>
                    <button onClick={() => remove(p)} className="text-[12px] text-[color:var(--color-terracotta)] hover:underline shrink-0">Remove</button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}

        {products.length === 0 && (
          <div className="rounded-xl border border-dashed border-[color:var(--color-ink)]/15 p-8 text-center">
            <p className="font-serif text-[22px]">Your menu is empty.</p>
            <p className="mt-1 text-[13px] text-[color:var(--color-ink-soft)]">Add your first item — customers see it instantly once your shop is active.</p>
          </div>
        )}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[color:var(--color-ink)]/40 backdrop-blur-sm">
          <div className="w-full max-w-[560px] rounded-t-3xl sm:rounded-3xl bg-[color:var(--color-paper)] border border-[color:var(--color-ink)]/10 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-[color:var(--color-ink)]/8 flex items-center justify-between sticky top-0 bg-[color:var(--color-paper)]">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">{editingId ? 'Edit item' : 'Add item'}</div>
                <h2 className="font-serif text-[22px] mt-0.5">{editingId ? form.name || 'Item' : 'New item'}</h2>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-[12px] text-[color:var(--color-ink-soft)]">Close</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Field label="Name"><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inp} /></Field>
              <Field label="Category">
                <select value={form.categorySlug} onChange={(e) => setForm((f) => ({ ...f, categorySlug: e.target.value }))} className={inp}>
                  {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Description"><textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inp} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Unit (e.g. 500g)"><input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className={inp} /></Field>
                <Field label="Image URL (optional)"><input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} className={inp} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="MRP (₹)"><input type="number" inputMode="numeric" value={form.mrpInr} onChange={(e) => setForm((f) => ({ ...f, mrpInr: e.target.value }))} className={inp} /></Field>
                <Field label={form.isRegulated ? 'Price = MRP (locked)' : 'Price (₹)'}>
                  <input type="number" inputMode="numeric" disabled={form.isRegulated} value={form.isRegulated ? form.mrpInr : form.priceInr} onChange={(e) => setForm((f) => ({ ...f, priceInr: e.target.value }))} className={inp} />
                </Field>
              </div>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-[12.5px]">
                  <input type="checkbox" checked={form.isRegulated} onChange={(e) => setForm((f) => ({ ...f, isRegulated: e.target.checked }))} className="accent-[color:var(--color-forest)]" />
                  Sells at printed MRP (regulated)
                </label>
                <label className="inline-flex items-center gap-2 text-[12.5px]">
                  <input type="checkbox" checked={form.isVeg} onChange={(e) => setForm((f) => ({ ...f, isVeg: e.target.checked }))} className="accent-[color:var(--color-forest)]" />
                  Vegetarian
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Accent colour">
                  <select value={form.accent} onChange={(e) => setForm((f) => ({ ...f, accent: e.target.value }))} className={inp}>
                    {ACCENTS.map((a) => <option key={a}>{a}</option>)}
                  </select>
                </Field>
                <Field label="Icon">
                  <select value={form.glyph} onChange={(e) => setForm((f) => ({ ...f, glyph: e.target.value }))} className={inp}>
                    {GLYPHS.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </Field>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button onClick={() => setDrawerOpen(false)} className="px-4 py-2 text-[13px] text-[color:var(--color-ink-soft)]">Cancel</button>
                <button disabled={saving || !form.name || !form.mrpInr} onClick={save} className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2 text-[13px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50">
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add to menu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inp = 'mt-1 w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-3 py-2 text-[13.5px] outline-none focus:border-[color:var(--color-forest)]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/75">{label}</span>
      {children}
    </label>
  );
}
