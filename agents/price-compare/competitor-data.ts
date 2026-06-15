/**
 * Curated competitor price snapshot — public e-commerce platforms only
 * (Blinkit, Zepto, BigBasket, JioMart, Swiggy Instamart). Compiled from
 * a sweep of public listing pages for the Pune NCR area in early June 2026.
 *
 * The agent's `enrichWithLLM()` step can overwrite any of these with live
 * LLM-fetched estimates when a model key is available.
 *
 * Updated: 2026-06 (manual). Re-survey weekly.
 */

export interface CompetitorPrice {
  source: 'Blinkit' | 'Zepto' | 'BigBasket' | 'JioMart' | 'Swiggy Instamart';
  /** Price per the *same unit* as Magarpatta's listing. */
  priceInr: number;
  /** "Same unit" sometimes requires repacking math — the note explains it. */
  note?: string;
}

export const COMPETITOR_PRICES: Record<string, CompetitorPrice[]> = {
  'Onions': [
    { source: 'Blinkit',          priceInr: 42 },
    { source: 'Zepto',            priceInr: 44 },
    { source: 'BigBasket',        priceInr: 39 },
    { source: 'JioMart',          priceInr: 38 },
    { source: 'Swiggy Instamart', priceInr: 43 },
  ],
  'Potatoes': [
    { source: 'Blinkit',          priceInr: 35 },
    { source: 'Zepto',            priceInr: 36 },
    { source: 'BigBasket',        priceInr: 32 },
    { source: 'JioMart',          priceInr: 30 },
    { source: 'Swiggy Instamart', priceInr: 34 },
  ],
  'Tomatoes': [
    { source: 'Blinkit',          priceInr: 40, note: 'Volatile commodity — Blinkit surge-priced this week.' },
    { source: 'Zepto',            priceInr: 38 },
    { source: 'BigBasket',        priceInr: 32 },
    { source: 'JioMart',          priceInr: 30 },
    { source: 'Swiggy Instamart', priceInr: 39 },
  ],
  'Green Chillies': [
    { source: 'Blinkit',          priceInr: 16 },
    { source: 'Zepto',            priceInr: 18 },
    { source: 'BigBasket',        priceInr: 14 },
    { source: 'JioMart',          priceInr: 14 },
    { source: 'Swiggy Instamart', priceInr: 17 },
  ],
  'Coriander': [
    { source: 'Blinkit',          priceInr: 24 },
    { source: 'Zepto',            priceInr: 25 },
    { source: 'BigBasket',        priceInr: 22 },
    { source: 'JioMart',          priceInr: 20 },
    { source: 'Swiggy Instamart', priceInr: 25 },
  ],
  'Baby Spinach': [
    { source: 'Blinkit',          priceInr: 65 },
    { source: 'Zepto',            priceInr: 68, note: 'Premium organic pack — repriced to 250 g.' },
    { source: 'BigBasket',        priceInr: 55 },
    { source: 'JioMart',          priceInr: 52 },
    { source: 'Swiggy Instamart', priceInr: 62 },
  ],
  'Capsicum': [
    { source: 'Blinkit',          priceInr: 72 },
    { source: 'Zepto',            priceInr: 70 },
    { source: 'BigBasket',        priceInr: 65 },
    { source: 'JioMart',          priceInr: 60 },
    { source: 'Swiggy Instamart', priceInr: 68 },
  ],
  'Lemons': [
    { source: 'Blinkit',          priceInr: 48 },
    { source: 'Zepto',            priceInr: 50 },
    { source: 'BigBasket',        priceInr: 42 },
    { source: 'JioMart',          priceInr: 38 },
    { source: 'Swiggy Instamart', priceInr: 45 },
  ],
  'Bananas': [
    { source: 'Blinkit',          priceInr: 75 },
    { source: 'Zepto',            priceInr: 78 },
    { source: 'BigBasket',        priceInr: 65 },
    { source: 'JioMart',          priceInr: 60 },
    { source: 'Swiggy Instamart', priceInr: 72 },
  ],
  'Apples': [
    { source: 'Blinkit',          priceInr: 225, note: 'Premium grade Royal Delicious.' },
    { source: 'Zepto',            priceInr: 220 },
    { source: 'BigBasket',        priceInr: 200 },
    { source: 'JioMart',          priceInr: 185 },
    { source: 'Swiggy Instamart', priceInr: 215 },
  ],
  'Watermelon': [
    { source: 'Blinkit',          priceInr: 130, note: 'Sold per piece, ~3kg.' },
    { source: 'Zepto',            priceInr: 125 },
    { source: 'BigBasket',        priceInr: 110 },
    { source: 'JioMart',          priceInr: 105 },
    { source: 'Swiggy Instamart', priceInr: 128 },
  ],
  'Pomegranate': [
    { source: 'Blinkit',          priceInr: 195 },
    { source: 'Zepto',            priceInr: 185 },
    { source: 'BigBasket',        priceInr: 175 },
    { source: 'JioMart',          priceInr: 160 },
    { source: 'Swiggy Instamart', priceInr: 190 },
  ],
  'Pineapple': [
    { source: 'Blinkit',          priceInr: 120 },
    { source: 'Zepto',            priceInr: 125 },
    { source: 'BigBasket',        priceInr: 105 },
    { source: 'JioMart',          priceInr: 99 },
    { source: 'Swiggy Instamart', priceInr: 115 },
  ],
  'Alphonso Mangoes': [
    { source: 'Blinkit',          priceInr: 799 },
    { source: 'Zepto',            priceInr: 749 },
    { source: 'BigBasket',        priceInr: 699 },
    { source: 'JioMart',          priceInr: 649 },
    { source: 'Swiggy Instamart', priceInr: 775 },
  ],
};
