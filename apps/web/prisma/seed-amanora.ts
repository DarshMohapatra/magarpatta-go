import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

/**
 * Demo seed for the Amanora Park Town instance. Mirrors the shape of
 * seed-dashboards.ts but with totally different vendors, hubs, and demo
 * phone ranges so the same human can run both staging instances side by
 * side without phone conflicts. Run with the Amanora DATABASE_URL pointed
 * at the new Neon project:
 *
 *   DATABASE_URL=<amanora url> pnpm tsx prisma/seed-amanora.ts
 */

const prisma = new PrismaClient();

function sha(pw: string): string {
  return createHash('sha256').update(pw).digest('hex');
}

async function main() {
  console.log('🌱 Seeding Amanora Park Town demo dashboards…');

  // ── Categories (idempotent — also seeded by seed-catalog.ts on Magarpatta) ──
  const categories: Record<string, { id: string }> = {};
  const CATEGORY_LIST = [
    { slug: 'sweets-snacks',   name: 'Sweets & Snacks',   glyph: 'sweet',    order: 10 },
    { slug: 'produce',         name: 'Fresh Produce',     glyph: 'leaf',     order: 20 },
    { slug: 'dairy',           name: 'Dairy & Eggs',      glyph: 'drop',     order: 30 },
    { slug: 'groceries',       name: 'Pantry Staples',    glyph: 'grain',    order: 40 },
    { slug: 'bakery',          name: 'Bakery',            glyph: 'loaf',     order: 50 },
    { slug: 'meat',            name: 'Fresh Meat',        glyph: 'cut',      order: 60 },
    { slug: 'medicines',       name: 'Medicines',         glyph: 'pill',     order: 70 },
    { slug: 'beverages',       name: 'Beverages',         glyph: 'cup',      order: 80 },
    { slug: 'essentials',      name: 'Daily Essentials',  glyph: 'box',      order: 90 },
  ];
  for (const c of CATEGORY_LIST) {
    const row = await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
    categories[c.slug] = row;
  }
  console.log(`  ✓ ${CATEGORY_LIST.length} categories upserted`);

  // ── Approved vendors ────────────────────────────────────────────
  // Phone range for Amanora vendors: 9100000001..09 (different from Magarpatta's 9000000001..07).
  type VendorSpec = {
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
  };

  const VENDORS: VendorSpec[] = [
    {
      slug: 'theobroma-am',
      name: 'Theobroma Patisserie',
      hub: 'Amanora Mall',
      description: 'Cult-favourite brownies, croissants and slices. Same-day-baked, walk-in counter at Amanora Mall.',
      accent: 'saffron',
      vendorType: 'bakery',
      ownerName: 'Kainaz Messman Harchandrai',
      ownerPhone: '9100000001',
      ownerEmail: 'amanora@theobroma.example',
      password: 'theo123',
      addressLine: 'F-12, Amanora Mall, Hadapsar',
      openTime: '09:00',
      closeTime: '23:00',
      gstin: '27TBPAT4321B1Z2',
      fssaiNumber: '11521998001001',
      panNumber: 'TBPAT4321B',
      bankAccountName: 'Theobroma Foods Pvt Ltd',
      bankAccountNumber: '01122334455667',
      bankIfsc: 'HDFC0000201',
      upiId: 'theobroma@hdfcbank',
      commissionPct: 18,
      supportsSelfDelivery: true,
      selfDeliveryFeeInr: 25,
    },
    {
      slug: 'trattoria-am',
      name: 'Trattoria Italiano',
      hub: 'Amanora Town Centre',
      description: 'Wood-fired pizza, hand-rolled pasta. Italian-trained chef, Maharashtra ingredients.',
      accent: 'terracotta',
      vendorType: 'restaurant',
      ownerName: 'Federico Russo',
      ownerPhone: '9100000002',
      ownerEmail: 'ciao@trattoria.example',
      password: 'trat123',
      addressLine: 'Shop 22, Town Centre, Amanora Park Town',
      openTime: '11:30',
      closeTime: '23:30',
      gstin: '27TRTIT9876R1Z3',
      fssaiNumber: '11521998001002',
      panNumber: 'TRTIT9876R',
      bankAccountName: 'Trattoria Italiano LLP',
      bankAccountNumber: '02233445566778',
      bankIfsc: 'ICIC0000345',
      upiId: 'trattoria@icici',
      commissionPct: 20,
      supportsSelfDelivery: false,
      selfDeliveryFeeInr: null,
    },
    {
      slug: 'bloom-am',
      name: 'Cafe Bloom',
      hub: 'Amanora Mall',
      description: 'Specialty pour-over, single-origin beans. Neighbourhood third-place since 2024.',
      accent: 'forest',
      vendorType: 'cafe',
      ownerName: 'Anjali Sethi',
      ownerPhone: '9100000003',
      ownerEmail: 'hello@bloomcafe.example',
      password: 'bloom123',
      addressLine: 'G-08, Amanora Mall, Hadapsar',
      openTime: '07:00',
      closeTime: '23:00',
      gstin: '27BLMCF5544Z1Z4',
      fssaiNumber: '11521998001003',
      panNumber: 'BLMCF5544Z',
      bankAccountName: 'Bloom Cafe & Co.',
      bankAccountNumber: '03344556677889',
      bankIfsc: 'AXIS0000123',
      upiId: 'bloom@axisbank',
      commissionPct: 22,
      supportsSelfDelivery: true,
      selfDeliveryFeeInr: 30,
    },
    {
      slug: 'medplus-am',
      name: 'MedPlus · Amanora',
      hub: 'Amanora Mall',
      description: 'Registered pharmacist on counter. Prescription refills, OTC, daily essentials.',
      accent: 'forest',
      vendorType: 'pharmacy',
      ownerName: 'Dr. Vikrant Kulkarni',
      ownerPhone: '9100000004',
      ownerEmail: 'amanora@medplus.example',
      password: 'med123',
      addressLine: 'F-04, Amanora Mall, near Gateway Towers',
      openTime: '08:00',
      closeTime: '23:00',
      drugLicense: 'MH/PUNE/R/2020/00821',
      panNumber: 'MEDPL3322K',
      bankAccountName: 'MedPlus Health Services',
      bankAccountNumber: '04455667788990',
      bankIfsc: 'SBIN0009876',
      upiId: 'medplus@sbi',
      commissionPct: 10,
      supportsSelfDelivery: false,
      selfDeliveryFeeInr: null,
    },
    {
      slug: 'starbazaar-am',
      name: 'Star Bazaar · Amanora',
      hub: 'Amanora Town Centre',
      description: 'Anchor supermarket: groceries, pantry staples, household. Tata-run.',
      accent: 'forest',
      vendorType: 'grocery',
      ownerName: 'Trent Hypermarket Pvt Ltd',
      ownerPhone: '9100000005',
      ownerEmail: 'amanora@starbazaar.example',
      password: 'star123',
      addressLine: 'Lower ground, Amanora Town Centre',
      openTime: '09:00',
      closeTime: '22:00',
      gstin: '27STRBZ7788T1Z5',
      fssaiNumber: '11521998001005',
      panNumber: 'STRBZ7788T',
      bankAccountName: 'Trent Hypermarket Pvt Ltd',
      bankAccountNumber: '05566778899001',
      bankIfsc: 'HDFC0000401',
      upiId: 'starbazaar@hdfc',
      commissionPct: 12,
      supportsSelfDelivery: false,
      selfDeliveryFeeInr: null,
    },
    {
      slug: 'freshcuts-am',
      name: 'Fresh Cuts Meat Co.',
      hub: 'Amanora Main Road',
      description: 'Cut-to-order chicken & mutton. Halal + jhatka clearly labelled. Cold chain end-to-end.',
      accent: 'terracotta',
      vendorType: 'meat',
      ownerName: 'Iqbal Sayyad',
      ownerPhone: '9100000007',
      ownerEmail: 'fresh@cuts.example',
      password: 'cuts123',
      addressLine: 'Shop 3, Amanora Main Road, Hadapsar',
      openTime: '07:00',
      closeTime: '21:00',
      fssaiNumber: '11521998001007',
      panNumber: 'FRSCT9988M',
      bankAccountName: 'Fresh Cuts Meat Co.',
      bankAccountNumber: '06677889900112',
      bankIfsc: 'HDFC0004567',
      upiId: 'freshcuts@hdfcbank',
      commissionPct: 15,
      supportsSelfDelivery: false,
      selfDeliveryFeeInr: null,
    },
  ];

  for (const v of VENDORS) {
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
      create: { slug: v.slug, name: v.name, hub: v.hub, description: v.description, accent: v.accent, ...fields },
    });
    const mode = v.supportsSelfDelivery ? 'self-delivery ON' : 'rider pickup';
    console.log(`  ✓ ${v.name} approved · ${mode} · login ${v.ownerPhone} / ${v.password}`);
  }

  // ── Pending vendor for the admin queue ──────────────────────────
  await prisma.vendor.upsert({
    where: { slug: 'burger-am' },
    update: {},
    create: {
      slug: 'burger-am',
      name: 'The Burger Co. · Amanora',
      hub: 'Amanora Main Road',
      vendorType: 'restaurant',
      description: 'Fast-casual burgers and fries. Awaiting approval.',
      accent: 'saffron',
      active: false,
      approvalStatus: 'PENDING',
      submittedAt: new Date(),
      ownerName: 'Ritesh Pawar',
      ownerPhone: '9100000006',
      ownerEmail: 'ritesh@burgerco.example',
      ownerPasswordHash: sha('burger123'),
      addressLine: 'Shop 18, Amanora Main Road, Hadapsar',
      openTime: '11:00',
      closeTime: '23:30',
      fssaiNumber: '11521998001006',
      panNumber: 'BRGCO5544X',
      bankAccountName: 'The Burger Co.',
      bankAccountNumber: '07788990011223',
      bankIfsc: 'SBIN0006543',
      upiId: 'burger@okaxis',
      commissionPct: 18,
    },
  });
  console.log(`  ✓ The Burger Co. (PENDING) seeded for admin review`);

  // ── Concierge-only vendor ───────────────────────────────────────
  await prisma.vendor.upsert({
    where: { slug: 'paan-republic-am' },
    update: {
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
      active: true,
      onPlatform: false,
      supportsSelfDelivery: false,
    },
    create: {
      slug: 'paan-republic-am',
      name: 'Paan Republic',
      hub: 'Amanora Town Centre',
      vendorType: 'sweets',
      description: 'Late-night paan stand by the town centre fountain. Walk-in only — our rider picks up for you.',
      accent: 'terracotta',
      active: true,
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
      addressLine: 'Stall near Amanora Town Centre fountain',
      openTime: '17:00',
      closeTime: '00:30',
      commissionPct: 0,
      onPlatform: false,
      supportsSelfDelivery: false,
      selfDeliveryAvailable: true,
    },
  });
  console.log(`  ✓ Paan Republic (CONCIERGE-ONLY · off platform) seeded`);

  // ── Products ────────────────────────────────────────────────────
  // imageUrl is set to a relative /products/foo path so the bundled local
  // image renders (no external image-search round trip for Amanora demo).
  type Item = {
    name: string;
    catSlug: string;
    mrp: number;
    unit: string;
    isVeg: boolean;
    isRegulated: boolean;
    accent: string;
    glyph: string;
    image: string;
    desc: string;
  };

  async function seedItems(vendorSlug: string, items: Item[]) {
    const vendor = await prisma.vendor.findUnique({ where: { slug: vendorSlug } });
    if (!vendor) return;
    for (const it of items) {
      const existing = await prisma.product.findFirst({ where: { vendorId: vendor.id, name: it.name } });
      const data = {
        vendorId: vendor.id,
        categoryId: categories[it.catSlug].id,
        name: it.name,
        description: it.desc,
        priceInr: it.isRegulated ? it.mrp : it.mrp + 1,
        mrpInr: it.mrp,
        unit: it.unit,
        isVeg: it.isVeg,
        isRegulated: it.isRegulated,
        accent: it.accent,
        glyph: it.glyph,
        imageUrl: `/products/${it.image}`,
        inStock: true,
      };
      if (existing) await prisma.product.update({ where: { id: existing.id }, data });
      else          await prisma.product.create({ data });
    }
    console.log(`  ✓ ${vendor.name} menu · ${items.length} items`);
  }

  // Theobroma — bakery + sweets
  await seedItems('theobroma-am', [
    { name: 'Dutch Truffle Cake (slice)', catSlug: 'sweets-snacks', mrp: 220, unit: '1 slice', isVeg: true, isRegulated: false, accent: 'saffron', glyph: 'sweet', image: 'theobroma-truffle-cake.jpg', desc: 'Cult favourite. Three layers of dark chocolate ganache.' },
    { name: 'Brownie Box (4 pcs)',         catSlug: 'sweets-snacks', mrp: 320, unit: '4 pcs',   isVeg: true, isRegulated: false, accent: 'saffron', glyph: 'sweet', image: 'theobroma-brownies.jpg',     desc: 'Fudgy centre, slight crackle on top. Good for sharing or not.' },
    { name: 'Red Velvet Slice',            catSlug: 'bakery',        mrp: 180, unit: '1 slice', isVeg: true, isRegulated: false, accent: 'saffron', glyph: 'loaf',  image: 'theobroma-red-velvet.jpg',   desc: 'Cream cheese frosting on a beetroot-tinted sponge.' },
    { name: 'Almond Croissant',            catSlug: 'bakery',        mrp: 160, unit: '1 pc',    isVeg: true, isRegulated: false, accent: 'saffron', glyph: 'loaf',  image: 'theobroma-croissant.jpg',    desc: 'Frangipane filling, flaky butter laminated dough.' },
    { name: 'Blueberry Muffin',            catSlug: 'bakery',        mrp: 110, unit: '1 pc',    isVeg: true, isRegulated: false, accent: 'saffron', glyph: 'loaf',  image: 'blueberry-muffin.jpg',       desc: 'Tangy berry pockets. Best in the morning, warm.' },
  ]);

  // Trattoria Italiano — pasta, pizza, sandwiches (categorised under bakery for now)
  await seedItems('trattoria-am', [
    { name: 'Margherita Pizza (10")',      catSlug: 'bakery',     mrp: 380, unit: '10 inch',  isVeg: true,  isRegulated: false, accent: 'terracotta', glyph: 'loaf', image: 'margherita-pizza.jpg',    desc: 'San Marzano tomato, fior di latte, basil.' },
    { name: 'Aglio e Olio',                catSlug: 'essentials', mrp: 320, unit: '1 plate',  isVeg: true,  isRegulated: false, accent: 'terracotta', glyph: 'box',  image: 'aglio-olio.jpg',          desc: 'Spaghetti, garlic, olive oil, chilli flakes, parsley.' },
    { name: 'BBQ Chicken Sizzler',         catSlug: 'meat',       mrp: 480, unit: '1 plate',  isVeg: false, isRegulated: false, accent: 'terracotta', glyph: 'cut',  image: 'bbq-chicken-sizzler.jpg', desc: 'Grilled marinated thigh, smoky BBQ glaze, peppers.' },
    { name: 'Classic Beef Burger',         catSlug: 'meat',       mrp: 360, unit: '1 burger', isVeg: false, isRegulated: false, accent: 'terracotta', glyph: 'cut',  image: 'classic-burger.jpg',      desc: 'Hand-pressed patty, sharp cheddar, brioche bun.' },
    { name: 'Malai Chicken Sandwich',      catSlug: 'meat',       mrp: 280, unit: '1 sandwich', isVeg: false, isRegulated: false, accent: 'terracotta', glyph: 'cut', image: 'malai-sandwich.jpg',    desc: 'Grilled cream-marinated chicken, mint chutney, focaccia.' },
  ]);

  // Cafe Bloom — beverages + cafe bites
  await seedItems('bloom-am', [
    { name: 'Cappuccino',                  catSlug: 'beverages', mrp: 180, unit: '240ml', isVeg: true, isRegulated: false, accent: 'forest', glyph: 'cup',  image: 'cbtl-cappuccino.jpg',     desc: 'Single-origin Coorg beans. Wet foam, double shot.' },
    { name: 'Mocha',                       catSlug: 'beverages', mrp: 220, unit: '300ml', isVeg: true, isRegulated: false, accent: 'forest', glyph: 'cup',  image: 'cbtl-mocha.jpg',          desc: '70% dark Tanzanian chocolate, espresso, steamed milk.' },
    { name: 'Earl Grey Tea',               catSlug: 'beverages', mrp: 140, unit: '200ml', isVeg: true, isRegulated: false, accent: 'forest', glyph: 'cup',  image: 'cbtl-earl-grey.jpg',      desc: 'Bergamot-perfumed loose-leaf, served with milk on the side.' },
    { name: 'Walnut Cookie',               catSlug: 'bakery',    mrp: 90,  unit: '1 pc',   isVeg: true, isRegulated: false, accent: 'forest', glyph: 'loaf', image: 'starbucks-cookie.jpg',    desc: 'Brown butter, dark chocolate chunks, walnut.' },
    { name: 'Plain Croissant',             catSlug: 'bakery',    mrp: 130, unit: '1 pc',   isVeg: true, isRegulated: false, accent: 'forest', glyph: 'loaf', image: 'starbucks-croissant.jpg', desc: 'All-butter, 36-hour fermented. Crisp shatter on every bite.' },
  ]);

  // MedPlus — pharmacy (regulated)
  await seedItems('medplus-am', [
    { name: 'Crocin Advance 500mg (15)',   catSlug: 'medicines',  mrp: 35,  unit: 'strip of 15', isVeg: true, isRegulated: true, accent: 'forest', glyph: 'pill', image: 'crocin.jpg',         desc: 'Paracetamol 500mg. Common fever / headache reliever.' },
    { name: 'Paracetamol 650mg (10)',      catSlug: 'medicines',  mrp: 28,  unit: 'strip of 10', isVeg: true, isRegulated: true, accent: 'forest', glyph: 'pill', image: 'paracetamol.jpg',    desc: 'Generic paracetamol. Always read the label.' },
    { name: 'ORS Sachet (Electral)',       catSlug: 'medicines',  mrp: 22,  unit: '21g',         isVeg: true, isRegulated: true, accent: 'forest', glyph: 'pill', image: 'ors-sachet.jpg',     desc: 'Oral rehydration. Mix with 200ml water.' },
    { name: 'Dettol Handwash (200ml)',     catSlug: 'essentials', mrp: 95,  unit: '200ml',       isVeg: true, isRegulated: true, accent: 'forest', glyph: 'box',  image: 'dettol-handwash.jpg', desc: 'Antibacterial liquid handwash. Pump bottle.' },
  ]);

  // Star Bazaar — pantry, regulated MRP
  await seedItems('starbazaar-am', [
    { name: 'Maggi 2-Min Noodles (pack of 4)', catSlug: 'groceries',  mrp: 56,  unit: '4×70g',  isVeg: true, isRegulated: true, accent: 'forest', glyph: 'grain', image: 'maggi.jpg',        desc: 'Masala flavour. Pantry staple.' },
    { name: 'Sunflower Oil (1L)',              catSlug: 'groceries',  mrp: 145, unit: '1L',     isVeg: true, isRegulated: true, accent: 'forest', glyph: 'grain', image: 'sunflower-oil.jpg', desc: 'Refined sunflower oil. PET bottle.' },
    { name: 'Tata Salt (1kg)',                 catSlug: 'groceries',  mrp: 28,  unit: '1kg',    isVeg: true, isRegulated: true, accent: 'forest', glyph: 'grain', image: 'tata-salt.jpg',     desc: 'Iodised salt. Free-flowing crystals.' },
    { name: 'Harpic Toilet Cleaner (500ml)',   catSlug: 'essentials', mrp: 110, unit: '500ml',  isVeg: true, isRegulated: true, accent: 'forest', glyph: 'box',   image: 'harpic.png',        desc: 'Powerful 10x toilet cleaner.' },
    { name: 'Green Chillies (200g)',           catSlug: 'produce',    mrp: 25,  unit: '200g',   isVeg: true, isRegulated: false, accent: 'forest', glyph: 'leaf',  image: 'green-chillies.jpg', desc: 'Fresh, hand-picked. Sharp heat.' },
  ]);

  // Fresh Cuts — meat
  await seedItems('freshcuts-am', [
    { name: 'Chicken Breast (boneless)',  catSlug: 'meat', mrp: 280, unit: '500g', isVeg: false, isRegulated: false, accent: 'terracotta', glyph: 'cut', image: 'chicken-breast.jpg', desc: 'Skinless, lean. Halal-cut on order.' },
    { name: 'Chicken Thigh (boneless)',   catSlug: 'meat', mrp: 240, unit: '500g', isVeg: false, isRegulated: false, accent: 'terracotta', glyph: 'cut', image: 'chicken-thigh.jpg',  desc: 'Boneless, skinless. Juicier than breast.' },
    { name: 'Chicken Keema (minced)',     catSlug: 'meat', mrp: 220, unit: '500g', isVeg: false, isRegulated: false, accent: 'terracotta', glyph: 'cut', image: 'chicken-keema.jpg',  desc: 'Coarse mince, ideal for kheema pav.' },
    { name: 'Mutton Curry-cut',           catSlug: 'meat', mrp: 720, unit: '500g', isVeg: false, isRegulated: false, accent: 'terracotta', glyph: 'cut', image: 'mutton-curry.jpg',   desc: 'Bone-in goat, traditional curry cut.' },
  ]);

  // Paan Republic — concierge sweets
  await seedItems('paan-republic-am', [
    { name: 'Classic Meetha Paan',  catSlug: 'sweets-snacks', mrp: 50, unit: '1 pc', isVeg: true, isRegulated: false, accent: 'terracotta', glyph: 'sweet', image: 'paan-classic-meetha.jpg', desc: 'Gulkand, fennel, coconut, cherry. Folded fresh.' },
    { name: 'Chocolate Paan',       catSlug: 'sweets-snacks', mrp: 70, unit: '1 pc', isVeg: true, isRegulated: false, accent: 'terracotta', glyph: 'sweet', image: 'paan-chocolate.jpg',      desc: 'Chocolate ganache, gulkand, betel leaf.' },
    { name: 'Banarasi Paan',        catSlug: 'sweets-snacks', mrp: 90, unit: '1 pc', isVeg: true, isRegulated: false, accent: 'terracotta', glyph: 'sweet', image: 'paan-banarasi.jpg',       desc: 'Premium Banaras leaf, silver leaf, slow chew.' },
  ]);

  // ── Admin ────────────────────────────────────────────────────
  await prisma.admin.upsert({
    where: { phone: '9999999888' },
    update: { name: 'Amanora Ops', passwordHash: sha('admin123'), role: 'SUPER_ADMIN' },
    create: {
      phone: '9999999888',
      name: 'Amanora Ops',
      email: 'ops@amanora.go',
      role: 'SUPER_ADMIN',
      passwordHash: sha('admin123'),
    },
  });
  console.log(`  ✓ Admin · 9999999888 / admin123`);

  // ── Curator ──────────────────────────────────────────────────
  await prisma.curator.upsert({
    where: { phone: '7000000002' },
    update: { name: 'Amanora Curator', active: true },
    create: { phone: '7000000002', name: 'Amanora Curator', active: true },
  });
  console.log(`  ✓ Curator · 7000000002 (OTP 123456 in demo mode)`);

  // ── Riders ───────────────────────────────────────────────────
  // Different phone range from Magarpatta riders (8888888801..05) so testers
  // can sign in to either instance without their cookies colliding.
  const RIDERS = [
    { phone: '8888889001', name: 'Suraj P.',   dl: 'MH14 2020 1188', aadhaarLast4: '5512', vehicle: 'motorcycle', veh: 'MH14 SP 7711' },
    { phone: '8888889002', name: 'Aarti V.',   dl: 'MH14 2021 0299', aadhaarLast4: '8801', vehicle: 'scooter',    veh: 'MH14 AV 4422' },
    { phone: '8888889003', name: 'Rahul N.',   dl: 'MH14 2019 0712', aadhaarLast4: '3344', vehicle: 'motorcycle', veh: 'MH14 RN 9001' },
    { phone: '8888889004', name: 'Pooja M.',   dl: 'MH14 2022 0445', aadhaarLast4: '6677', vehicle: 'bicycle',    veh: '—' },
  ];
  for (const r of RIDERS) {
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
  console.log(`  ✓ ${RIDERS.length} approved riders synced`);

  // Pending rider for the admin queue
  await prisma.riderProfile.upsert({
    where: { phone: '8888889005' },
    update: {},
    create: {
      phone: '8888889005',
      name: 'Sandeep K.',
      email: 'sandeep@example.com',
      approvalStatus: 'PENDING',
      dlNumber: 'MH14 2024 0011',
      aadhaarNumber: '0000 0000 9988',
      vehicleType: 'scooter',
      vehicleNumber: 'MH14 SK 0808',
      perDropInr: 30,
    },
  });
  console.log(`  ✓ 1 pending rider (Sandeep K.) seeded for admin review`);

  console.log('\n✅ Amanora dashboards seeded.');
  console.log('\nLogins:');
  console.log('  Vendor · 9100000001 / theo123    (Theobroma Patisserie)');
  console.log('  Vendor · 9100000002 / trat123    (Trattoria Italiano)');
  console.log('  Vendor · 9100000003 / bloom123   (Cafe Bloom)');
  console.log('  Vendor · 9100000004 / med123     (MedPlus · Amanora)');
  console.log('  Vendor · 9100000005 / star123    (Star Bazaar · Amanora)');
  console.log('  Vendor · 9100000007 / cuts123    (Fresh Cuts Meat Co.)');
  console.log('  Vendor · 9100000006 / burger123  (The Burger Co. — PENDING)');
  console.log('  Admin  · 9999999888 / admin123');
  console.log('  Curator· 7000000002 (OTP 123456 in demo mode)');
  console.log('  Rider  · any of 8888889001..04 (no password)');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
