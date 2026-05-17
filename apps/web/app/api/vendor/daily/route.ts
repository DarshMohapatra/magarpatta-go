import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVendorSession } from '@/lib/vendor-session';
import { logActivity } from '@/lib/activity-log';
import { startOfDayUtc, isoToday } from '@/lib/slots';

/**
 * Daily price/stock overrides for the signed-in vendor's products. GET lists
 * each product alongside today's override (if any) and the most recent prior
 * override. POST upserts one row at a time — vendors save inline so the UI
 * can react per-row without a wholesale form submit.
 */

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });

  const url = new URL(req.url);
  const date = url.searchParams.get('date') ?? isoToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }
  const target = startOfDayUtc(new Date(date));

  const products = await prisma.product.findMany({
    where: { vendorId: s.vendorId },
    orderBy: { name: 'asc' },
    include: { category: { select: { name: true, slug: true } } },
  });

  const overrides = await prisma.productDailyOverride.findMany({
    where: {
      vendorId: s.vendorId,
      forDate: { lte: target },
    },
    orderBy: [{ productId: 'asc' }, { forDate: 'desc' }],
  });

  const todayByProduct = new Map<string, typeof overrides[number]>();
  const priorByProduct = new Map<string, typeof overrides[number]>();
  for (const o of overrides) {
    if (startOfDayUtc(o.forDate).getTime() === target.getTime()) {
      if (!todayByProduct.has(o.productId)) todayByProduct.set(o.productId, o);
    } else {
      if (!priorByProduct.has(o.productId)) priorByProduct.set(o.productId, o);
    }
  }

  return NextResponse.json({
    ok: true,
    date,
    rows: products.map((p) => {
      const today = todayByProduct.get(p.id) ?? null;
      const prior = priorByProduct.get(p.id) ?? null;
      const effectivePrice = today?.priceInr ?? prior?.priceInr ?? p.priceInr;
      const effectiveMrp = today?.mrpInr ?? prior?.mrpInr ?? p.mrpInr ?? p.priceInr;
      const effectiveStock = today?.inStock ?? prior?.inStock ?? p.inStock;
      return {
        productId: p.id,
        name: p.name,
        unit: p.unit,
        category: p.category.name,
        masterPriceInr: p.priceInr,
        masterMrpInr: p.mrpInr,
        masterInStock: p.inStock,
        todayOverride: today
          ? { priceInr: today.priceInr, mrpInr: today.mrpInr, inStock: today.inStock, note: today.note, updatedAt: today.updatedAt }
          : null,
        priorOverride: prior
          ? { priceInr: prior.priceInr, mrpInr: prior.mrpInr, inStock: prior.inStock, forDate: prior.forDate }
          : null,
        effective: { priceInr: effectivePrice, mrpInr: effectiveMrp, inStock: effectiveStock },
      };
    }),
  });
}

interface PostBody {
  productId?: string;
  date?: string;            // YYYY-MM-DD, defaults to today
  priceInr?: number | null;
  mrpInr?: number | null;
  inStock?: boolean | null;
  note?: string | null;
  /** When true, deletes the override row for that date instead of upserting. */
  clear?: boolean;
}

export async function POST(req: Request) {
  const s = await getVendorSession();
  if (!s) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  if (s.approvalStatus !== 'APPROVED') {
    return NextResponse.json({ ok: false, error: 'Shop is not yet approved.' }, { status: 403 });
  }

  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.productId) {
    return NextResponse.json({ ok: false, error: 'productId is required' }, { status: 400 });
  }
  const date = body.date ?? isoToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: 'date must be YYYY-MM-DD' }, { status: 400 });
  }
  const forDate = startOfDayUtc(new Date(date));

  // Ownership check — vendor can only touch their own products.
  const product = await prisma.product.findFirst({
    where: { id: body.productId, vendorId: s.vendorId },
  });
  if (!product) return NextResponse.json({ ok: false, error: 'Product not found' }, { status: 404 });

  if (body.clear) {
    await prisma.productDailyOverride.deleteMany({
      where: { productId: product.id, forDate },
    });
    await logActivity({
      actorRole: 'VENDOR',
      actorId: s.vendorId,
      actorName: s.shopName ?? 'Vendor',
      action: 'DAILY_OVERRIDE_CLEAR',
      summary: `${s.shopName ?? 'Vendor'} cleared override for ${product.name} on ${date}`,
      metadata: { productId: product.id, date },
    });
    return NextResponse.json({ ok: true, cleared: true });
  }

  const priceInr = body.priceInr === undefined || body.priceInr === null ? null : Math.max(0, Math.floor(body.priceInr));
  const mrpInr = body.mrpInr === undefined || body.mrpInr === null ? null : Math.max(0, Math.floor(body.mrpInr));
  const inStock = body.inStock === undefined ? null : body.inStock === null ? null : Boolean(body.inStock);

  if (priceInr === null && mrpInr === null && inStock === null && !body.note) {
    return NextResponse.json({ ok: false, error: 'Nothing to set on this override' }, { status: 400 });
  }
  if (priceInr !== null && mrpInr !== null && priceInr > mrpInr) {
    return NextResponse.json({ ok: false, error: 'Sale price cannot be higher than MRP' }, { status: 400 });
  }

  const row = await prisma.productDailyOverride.upsert({
    where: { productId_forDate: { productId: product.id, forDate } },
    create: {
      productId: product.id,
      vendorId: s.vendorId,
      forDate,
      priceInr,
      mrpInr,
      inStock,
      note: body.note ?? null,
    },
    update: {
      priceInr,
      mrpInr,
      inStock,
      note: body.note ?? null,
    },
  });

  await logActivity({
    actorRole: 'VENDOR',
    actorId: s.vendorId,
    actorName: s.shopName ?? 'Vendor',
    action: 'DAILY_OVERRIDE_SET',
    summary: `${s.shopName ?? 'Vendor'} updated ${product.name} for ${date}`,
    metadata: { productId: product.id, date, priceInr, mrpInr, inStock },
  });

  return NextResponse.json({ ok: true, override: row });
}
