/**
 * The 13 produce items on Magarpatta Go's catalog right now, with the
 * prices they sell at (matches prisma/seed-wholesale.ts + the Alphonso
 * row from prisma/seed-catalog.ts).
 *
 * Keeping this as a flat array (not pulled from DB) so the demo runs
 * anywhere — no DATABASE_URL needed, no network — and the comparison
 * stays reproducible week-to-week even as the live DB shifts.
 */

export interface CatalogItem {
  name: string;
  /** Display unit, matches the customer-facing card. */
  unit: string;
  /** Magarpatta's selling price in ₹. */
  priceInr: number;
  /**
   * Normalized price per kilogram (₹/kg). Lets us compare apples to
   * apples when competitor packs differ ("1 dozen", "500g", "1 whole").
   * Hand-derived per row so the demo doesn't have to guess unit math.
   */
  pricePerKgInr: number;
  /** Short tag for the report's "best deal" / "worst deal" callouts. */
  category: 'staple' | 'leaf' | 'fruit' | 'specialty';
}

export const MAGARPATTA_CATALOG: CatalogItem[] = [
  { name: 'Onions',         unit: '1 kg',       priceInr: 35,  pricePerKgInr: 35,  category: 'staple' },
  { name: 'Potatoes',       unit: '1 kg',       priceInr: 28,  pricePerKgInr: 28,  category: 'staple' },
  { name: 'Tomatoes',       unit: '1 kg',       priceInr: 24,  pricePerKgInr: 24,  category: 'staple' },
  { name: 'Green Chillies', unit: '100 g',      priceInr: 12,  pricePerKgInr: 120, category: 'leaf' },
  { name: 'Coriander',      unit: '100 g',      priceInr: 18,  pricePerKgInr: 180, category: 'leaf' },
  { name: 'Baby Spinach',   unit: '250 g',      priceInr: 48,  pricePerKgInr: 192, category: 'leaf' },
  { name: 'Capsicum',       unit: '500 g',      priceInr: 55,  pricePerKgInr: 110, category: 'staple' },
  { name: 'Lemons',         unit: '500 g',      priceInr: 32,  pricePerKgInr: 64,  category: 'staple' },
  { name: 'Bananas',        unit: '1 dozen',    priceInr: 58,  pricePerKgInr: 48,  category: 'fruit' },
  { name: 'Apples',         unit: '1 kg',       priceInr: 165, pricePerKgInr: 165, category: 'fruit' },
  { name: 'Watermelon',     unit: '1 whole 3kg', priceInr: 95, pricePerKgInr: 32,  category: 'fruit' },
  { name: 'Pomegranate',    unit: '1 kg',       priceInr: 145, pricePerKgInr: 145, category: 'fruit' },
  { name: 'Pineapple',      unit: '1 whole',    priceInr: 90,  pricePerKgInr: 60,  category: 'fruit' },
  { name: 'Alphonso Mangoes', unit: '1 dozen',  priceInr: 599, pricePerKgInr: 250, category: 'specialty' },
];
