import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

function sha(pw: string): string {
  return createHash('sha256').update(pw).digest('hex');
}

async function main() {
  console.log('🌱 Seeding vendor/admin/rider dashboards…');

  // ── Approved demo vendors ─────────────────────────────────────
  const kalika = await prisma.vendor.update({
    where: { slug: 'kalika' },
    data: {
      approvalStatus: 'APPROVED',
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
      supportsSelfDelivery: true,    // demo flow A — vendor-direct delivery
      selfDeliveryFeeInr: 20,
    },
  });
  console.log(`  ✓ Kalika Sweets approved · self-delivery ON · login 9000000001 / kalika123`);

  const bakers = await prisma.vendor.update({
    where: { slug: 'bakers' },
    data: {
      approvalStatus: 'APPROVED',
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
      supportsSelfDelivery: false,   // demo flow B — platform rider does pickup
      selfDeliveryFeeInr: null,
    },
  });
  console.log(`  ✓ Baker's Basket approved · rider pickup · login 9000000002 / bakers123`);

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
