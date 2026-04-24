import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function sha(pw: string): string {
  return createHash('sha256').update(pw).digest('hex');
}

async function main() {
  console.log('🌱 Seeding vendor/admin/rider dashboards…');

  // ── Approved demo vendors (upsert so it works on a fresh DB too) ────
  const kalikaFields = {
    approvalStatus: 'APPROVED' as const,
    approvedAt: new Date(),
    active: true,
    vendorType: 'sweets',
    ownerName: 'Rajesh Kalika',
    ownerPhone: '9000000001',
    ownerEmail: 'owner@kalika.example',
    ownerPasswordHash: sha('kalika123'),
    addressLine: 'Shop 4, Magarpatta Market, Hadapsar',
    openTime: '08:00',
    closeTime: '22:30',
    gstin: '27AAAPL1234C1Z5',
    fssaiNumber: '11521998000123',
    panNumber: 'AAAPL1234C',
    bankAccountName: 'Kalika Sweets & Snacks',
    bankAccountNumber: '50100123456789',
    bankIfsc: 'HDFC0001234',
    upiId: 'kalika@hdfcbank',
    commissionPct: 15,
    supportsSelfDelivery: false,
    selfDeliveryFeeInr: null,
  };
  const kalika = await prisma.vendor.upsert({
    where: { slug: 'kalika' },
    update: kalikaFields,
    create: {
      slug: 'kalika',
      name: 'Kalika Sweets',
      hub: 'Magarpatta Market',
      description: 'Fresh-from-the-kadhai sweets and snacks. Institutional Magarpatta since 1998.',
      accent: 'saffron',
      ...kalikaFields,
    },
  });
  console.log(`  ✓ Kalika Sweets approved · rider pickup · login 9000000001 / kalika123`);

  const bakersFields = {
    approvalStatus: 'APPROVED' as const,
    approvedAt: new Date(),
    active: true,
    vendorType: 'bakery',
    ownerName: 'Priya Menon',
    ownerPhone: '9000000002',
    ownerEmail: 'hello@bakersbasket.example',
    ownerPasswordHash: sha('bakers123'),
    addressLine: 'Ground floor, Seasons Mall, Magarpatta',
    openTime: '07:00',
    closeTime: '23:00',
    gstin: '27BAKPL4321M1Z9',
    fssaiNumber: '11521998000456',
    panNumber: 'BAKPL4321M',
    bankAccountName: "The Baker's Basket LLP",
    bankAccountNumber: '00222244446666',
    bankIfsc: 'ICIC0000222',
    upiId: 'bakers@icici',
    commissionPct: 18,
    supportsSelfDelivery: true,
    selfDeliveryFeeInr: 20,
  };
  const bakers = await prisma.vendor.upsert({
    where: { slug: 'bakers' },
    update: bakersFields,
    create: {
      slug: 'bakers',
      name: "The Baker's Basket",
      hub: 'Seasons Mall',
      description: 'Sourdough, croissants, seasonal loaves. Still-warm deliveries every morning.',
      accent: 'saffron',
      ...bakersFields,
    },
  });
  console.log(`  ✓ Baker's Basket approved · self-delivery ON · login 9000000002 / bakers123`);

  // ── Extra items for Baker's Basket (upsert by vendor+name) ────
  const bakeryCategory = await prisma.category.upsert({
    where: { slug: 'bakery' },
    update: {},
    create: { slug: 'bakery', name: 'Bakery', glyph: 'loaf', order: 50 },
  });
  const beveragesCategory = await prisma.category.upsert({
    where: { slug: 'beverages' },
    update: {},
    create: { slug: 'beverages', name: 'Beverages', glyph: 'cup', order: 80 },
  });
  const bakersItems = [
    { name: 'Butter Croissant',    category: bakeryCategory,    mrp: 90,  unit: '1 pc',    desc: 'All-butter laminated dough. Flaky, warm on arrival.' },
    { name: 'Chocolate Croissant', category: bakeryCategory,    mrp: 120, unit: '1 pc',    desc: 'Dark chocolate baton folded in.' },
    { name: 'Cheese Danish',       category: bakeryCategory,    mrp: 110, unit: '1 pc',    desc: 'Cream cheese + buttery pastry.' },
    { name: 'Multigrain Loaf',     category: bakeryCategory,    mrp: 180, unit: '500g',    desc: 'Oats, seeds, whole wheat. Baked daily at 4am.' },
    { name: 'Red Velvet Slice',    category: bakeryCategory,    mrp: 160, unit: '1 slice', desc: 'Cream cheese frosting.' },
    { name: 'Tiramisu Cup',        category: bakeryCategory,    mrp: 180, unit: '1 cup',   desc: 'Coffee-soaked ladyfingers, mascarpone.' },
    { name: 'Garlic Focaccia',     category: bakeryCategory,    mrp: 160, unit: '250g',    desc: 'Olive oil, rosemary, Maldon salt.' },
    { name: 'Plum Cake',           category: bakeryCategory,    mrp: 220, unit: '400g',    desc: 'Rum-soaked fruit, holiday classic.' },
    { name: 'Cold Coffee',         category: beveragesCategory, mrp: 140, unit: '300ml',   desc: 'House blend, milk, sugar. Not too sweet.' },
    { name: 'Masala Chai',         category: beveragesCategory, mrp: 60,  unit: '200ml',   desc: 'Stovetop brew, cardamom-ginger.' },
  ];
  for (const it of bakersItems) {
    const existing = await prisma.product.findFirst({
      where: { vendorId: bakers.id, name: it.name },
    });
    const productData = {
      vendorId: bakers.id,
      categoryId: it.category.id,
      name: it.name,
      description: it.desc,
      priceInr: it.mrp + 1,        // non-regulated +₹1 markup
      mrpInr: it.mrp,
      unit: it.unit,
      isVeg: true,
      isRegulated: false,
      accent: 'saffron',
      glyph: it.category.slug === 'bakery' ? 'loaf' : 'cup',
      inStock: true,
    };
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data: productData });
    } else {
      await prisma.product.create({ data: productData });
    }
  }
  console.log(`  ✓ Baker's Basket menu · ${bakersItems.length} items upserted`);

  // ── Approve the rest of the seeded catalog as demo vendors ────
  // Each one upserts so it works whether the base catalog seed has run or not.
  const MORE_VENDORS: Array<{
    slug: string;
    name: string;
    hub: string;
    description: string;
    accent: string;
    vendorType: string;
    ownerName: string;
    ownerPhone: string;
    ownerEmail: string;
    password: string;
    addressLine: string;
    openTime: string;
    closeTime: string;
    gstin?: string;
    fssaiNumber?: string;
    drugLicense?: string;
    panNumber: string;
    bankAccountName: string;
    bankAccountNumber: string;
    bankIfsc: string;
    upiId: string;
    commissionPct: number;
    supportsSelfDelivery: boolean;
    selfDeliveryFeeInr: number | null;
  }> = [
    {
      slug: 'dc',
      name: 'Destination Centre',
      hub: 'Destination Centre',
      description: "The township's flagship grocery + supermarket. Everything, one aisle away.",
      accent: 'forest',
      vendorType: 'grocery',
      ownerName: 'Anil Deshmukh',
      ownerPhone: '9000000004',
      ownerEmail: 'owner@dc.example',
      password: 'dcmart123',
      addressLine: 'Destination Centre, Magarpatta City, Hadapsar',
      openTime: '08:00',
      closeTime: '23:00',
      gstin: '27DCLPL5678N1Z8',
      fssaiNumber: '11521998000234',
      panNumber: 'DCLPL5678N',
      bankAccountName: 'Destination Centre Retail Pvt Ltd',
      bankAccountNumber: '40012345678900',
      bankIfsc: 'AXIS0000321',
      upiId: 'dc@axisbank',
      commissionPct: 12,
      supportsSelfDelivery: false,
      selfDeliveryFeeInr: null,
    },
    {
      slug: 'shraddha',
      name: 'Shraddha Meats',
      hub: 'Magarpatta Market',
      description: 'Cut-to-order fresh meat. Halal and jhatka clearly labelled. Chill chain maintained.',
      accent: 'terracotta',
      vendorType: 'meat',
      ownerName: 'Shraddha Bhosale',
      ownerPhone: '9000000005',
      ownerEmail: 'owner@shraddhameats.example',
      password: 'shraddha123',
      addressLine: 'Shop 7, Magarpatta Market, Hadapsar',
      openTime: '07:00',
      closeTime: '21:00',
      fssaiNumber: '11521998000345',
      panNumber: 'SHRDM2345P',
      bankAccountName: 'Shraddha Meats',
      bankAccountNumber: '60098765432100',
      bankIfsc: 'HDFC0004567',
      upiId: 'shraddha@hdfcbank',
      commissionPct: 15,
      supportsSelfDelivery: false,
      selfDeliveryFeeInr: null,
    },
    {
      slug: 'mg-pharmacy',
      name: 'Magarpatta Pharmacy',
      hub: 'Magarpatta',
      description: 'Registered pharmacist on site. Prescription refills handled with care.',
      accent: 'forest',
      vendorType: 'pharmacy',
      ownerName: 'Dr. Meera Joshi',
      ownerPhone: '9000000006',
      ownerEmail: 'rx@mgpharma.example',
      password: 'mgpharma123',
      addressLine: 'Ground floor, Nyati Millenium, Magarpatta',
      openTime: '08:00',
      closeTime: '23:00',
      drugLicense: 'MH/PUNE/R/2018/00421',
      fssaiNumber: '',
      panNumber: 'MGPHR7890Q',
      bankAccountName: 'Magarpatta Pharmacy',
      bankAccountNumber: '33311122244455',
      bankIfsc: 'SBIN0006789',
      upiId: 'mgpharma@sbi',
      commissionPct: 10,
      supportsSelfDelivery: false,
      selfDeliveryFeeInr: null,
    },
    {
      slug: 'starbucks',
      name: 'Starbucks · Seasons',
      hub: 'Seasons Mall',
      description: 'Coffee from the counter to your door in under 20 minutes.',
      accent: 'forest',
      vendorType: 'cafe',
      ownerName: 'Tata Starbucks · Magarpatta',
      ownerPhone: '9000000007',
      ownerEmail: 'mgr.seasons@starbucks.example',
      password: 'sbuxmg123',
      addressLine: 'Ground floor, Seasons Mall, Magarpatta',
      openTime: '07:00',
      closeTime: '23:30',
      gstin: '27SBUKS9999S1Z1',
      fssaiNumber: '11521998000567',
      panNumber: 'SBUCS9999S',
      bankAccountName: 'Tata Starbucks Pvt Ltd',
      bankAccountNumber: '90011122233344',
      bankIfsc: 'HDFC0000100',
      upiId: 'starbucks@hdfc',
      commissionPct: 20,
      supportsSelfDelivery: true,
      selfDeliveryFeeInr: 25,
    },
  ];

  for (const v of MORE_VENDORS) {
    const fields = {
      approvalStatus: 'APPROVED' as const,
      approvedAt: new Date(),
      active: true,
      vendorType: v.vendorType,
      ownerName: v.ownerName,
      ownerPhone: v.ownerPhone,
      ownerEmail: v.ownerEmail,
      ownerPasswordHash: sha(v.password),
      addressLine: v.addressLine,
      openTime: v.openTime,
      closeTime: v.closeTime,
      gstin: v.gstin ?? null,
      fssaiNumber: v.fssaiNumber ?? null,
      drugLicense: v.drugLicense ?? null,
      panNumber: v.panNumber,
      bankAccountName: v.bankAccountName,
      bankAccountNumber: v.bankAccountNumber,
      bankIfsc: v.bankIfsc,
      upiId: v.upiId,
      commissionPct: v.commissionPct,
      supportsSelfDelivery: v.supportsSelfDelivery,
      selfDeliveryFeeInr: v.selfDeliveryFeeInr,
    };
    await prisma.vendor.upsert({
      where: { slug: v.slug },
      update: fields,
      create: {
        slug: v.slug,
        name: v.name,
        hub: v.hub,
        description: v.description,
        accent: v.accent,
        ...fields,
      },
    });
    const mode = v.supportsSelfDelivery ? 'self-delivery ON' : 'rider pickup';
    console.log(`  ✓ ${v.name} approved · ${mode} · login ${v.ownerPhone} / ${v.password}`);
  }

  // ── Pending demo vendor for admin approval queue ──────────────
  await prisma.vendor.upsert({
    where: { slug: 'dosa-house' },
    update: {},
    create: {
      slug: 'dosa-house',
      name: 'Demo Dosa House',
      hub: 'Magarpatta Market',
      vendorType: 'restaurant',
      description: 'South Indian, fresh daily. Awaiting approval.',
      accent: 'saffron',
      active: false,
      approvalStatus: 'PENDING',
      submittedAt: new Date(),
      ownerName: 'Suresh Nair',
      ownerPhone: '9000000003',
      ownerEmail: 'suresh@dosahouse.example',
      ownerPasswordHash: sha('dosa123'),
      addressLine: 'Shop 12, Magarpatta Market',
      openTime: '07:00',
      closeTime: '22:00',
      fssaiNumber: '11521998000789',
      panNumber: 'DOSAP1234Q',
      bankAccountName: 'Demo Dosa House',
      bankAccountNumber: '77777788889999',
      bankIfsc: 'SBIN0005432',
      upiId: 'dosa@okaxis',
      commissionPct: 15,
    },
  });
  console.log(`  ✓ Demo Dosa House (PENDING) seeded for admin review`);

  // ── Concierge-only vendor (no dashboard, rider walks in) ─────
  await prisma.vendor.upsert({
    where: { slug: 'gulab-paan' },
    update: {
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
      active: true,
      onPlatform: false,           // concierge-only
      supportsSelfDelivery: false,
    },
    create: {
      slug: 'gulab-paan',
      name: 'Gulab Paan Corner',
      hub: 'Magarpatta Market',
      vendorType: 'sweets',
      description: 'Legendary paan stand outside the market gate. Walk-in only — our rider picks up for you.',
      accent: 'terracotta',
      active: true,
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
      addressLine: 'Pavement stall, near Magarpatta Market gate',
      openTime: '16:00',
      closeTime: '23:30',
      commissionPct: 0,           // concierge vendors don't share commission
      onPlatform: false,
      supportsSelfDelivery: false,
      selfDeliveryAvailable: true,
    },
  });
  console.log(`  ✓ Gulab Paan Corner (CONCIERGE-ONLY · off platform) seeded`);

  // Add a couple of stock items so customers can order from the concierge vendor.
  const sweetsCategory = await prisma.category.upsert({
    where: { slug: 'sweets-snacks' },
    update: {},
    create: { slug: 'sweets-snacks', name: 'Sweets & Snacks', glyph: 'sweet', order: 10 },
  });
  const paanVendor = await prisma.vendor.findUnique({ where: { slug: 'gulab-paan' } });
  if (paanVendor) {
    const paanItems = [
      { name: 'Classic Meetha Paan',    mrp: 40, unit: '1 pc' },
      { name: 'Chocolate Paan',         mrp: 60, unit: '1 pc' },
      { name: 'Banarasi Paan',          mrp: 80, unit: '1 pc' },
    ];
    for (const it of paanItems) {
      const existing = await prisma.product.findFirst({ where: { vendorId: paanVendor.id, name: it.name } });
      const data = {
        vendorId: paanVendor.id,
        categoryId: sweetsCategory.id,
        name: it.name,
        description: 'Freshly folded at the stall.',
        priceInr: it.mrp + 1,
        mrpInr: it.mrp,
        unit: it.unit,
        isVeg: true,
        isRegulated: false,
        accent: 'terracotta',
        glyph: 'sweet',
        inStock: true,
      };
      if (existing) await prisma.product.update({ where: { id: existing.id }, data });
      else          await prisma.product.create({ data });
    }
    console.log(`  ✓ Gulab Paan Corner menu · ${paanItems.length} items`);
  }

  // ── Admin ────────────────────────────────────────────────────
  await prisma.admin.upsert({
    where: { phone: '9999999999' },
    update: { name: 'Magarpatta Ops', passwordHash: sha('admin123'), role: 'SUPER_ADMIN' },
    create: {
      phone: '9999999999',
      name: 'Magarpatta Ops',
      email: 'ops@magarpatta.go',
      role: 'SUPER_ADMIN',
      passwordHash: sha('admin123'),
    },
  });
  console.log(`  ✓ Admin · 9999999999 / admin123`);

  // ── Riders — sync with hardcoded roster in lib/riders.ts ─────
  const RIDER_ROSTER = [
    { phone: '8888888801', name: 'Akash M.', dl: 'MH12 2019 0021', aadhaarLast4: '4421', vehicle: 'motorcycle', veh: 'MH12 AM 2211' },
    { phone: '8888888802', name: 'Priya S.', dl: 'MH12 2020 0088', aadhaarLast4: '7712', vehicle: 'scooter',    veh: 'MH12 PS 1040' },
    { phone: '8888888803', name: 'Rohan D.', dl: 'MH12 2018 0154', aadhaarLast4: '0921', vehicle: 'motorcycle', veh: 'MH12 RD 8820' },
    { phone: '8888888804', name: 'Neha K.',  dl: 'MH12 2021 0309', aadhaarLast4: '6638', vehicle: 'bicycle',    veh: '—' },
  ];
  for (const r of RIDER_ROSTER) {
    await prisma.riderProfile.upsert({
      where: { phone: r.phone },
      update: {
        name: r.name,
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        dlNumber: r.dl,
        aadhaarNumber: '0000 0000 ' + r.aadhaarLast4,
        vehicleType: r.vehicle,
        vehicleNumber: r.veh,
        perDropInr: 30,
      },
      create: {
        phone: r.phone,
        name: r.name,
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        dlNumber: r.dl,
        aadhaarNumber: '0000 0000 ' + r.aadhaarLast4,
        vehicleType: r.vehicle,
        vehicleNumber: r.veh,
        perDropInr: 30,
      },
    });
  }
  console.log(`  ✓ 4 approved riders synced`);

  // One pending rider for the admin approval queue
  await prisma.riderProfile.upsert({
    where: { phone: '8888888805' },
    update: {},
    create: {
      phone: '8888888805',
      name: 'Kiran J.',
      email: 'kiran@example.com',
      approvalStatus: 'PENDING',
      dlNumber: 'MH12 2023 0011',
      aadhaarNumber: '0000 0000 1155',
      vehicleType: 'scooter',
      vehicleNumber: 'MH12 KJ 5050',
      perDropInr: 30,
    },
  });
  console.log(`  ✓ 1 pending rider (Kiran J.) seeded for admin review`);

  console.log('\n✅ Dashboards seeded.');
  console.log('\nLogins:');
  console.log('  Vendor · 9000000001 / kalika123 (Kalika Sweets)');
  console.log('  Vendor · 9000000002 / bakers123 (Baker\'s Basket)');
  console.log('  Admin  · 9999999999 / admin123');
  console.log('  Rider  · any of 8888888801..04 (no password)');

  // Make sure used vars don't trip unused-var lints
  void kalika; void bakers;
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
