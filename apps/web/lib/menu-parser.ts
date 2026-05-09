export interface ParsedItem {
  name: string;
  priceInr: number;
  unit?: string;
}

// Matches a trailing price like "₹240", "Rs.260", "Rs 200", "200/-", "200",
// "39.00" or "39.50" (decimals allowed — common on printed café menus).
// Captures the rest of the line as the candidate name.
const PRICE_LINE = /^(.+?)[\s.\-—–:_·•=>]*(?:rs\.?|inr|₹)?\s*(\d{2,4})(?:\.\d{1,2})?(?:\/?-)?\s*$/i;

// Numeric units: "500ml", "1 kg", "250 gms", "1.5 ltr", "6 pcs".
const NUMERIC_UNIT = /\b(\d+(?:\.\d+)?)\s*(ml|millilit(?:re|er)s?|l|ltr|litres?|liters?|g|gm|gms|gram(?:me)?s?|kg|kgs|kilo(?:gram(?:me)?s?)?|pcs?|piece[s]?|nos?\.?|inch(?:es)?|cm)\b/i;

// Bracketed portion words: "(Half)", "[Regular]", "(Mini)".
const PORTION_BRACKETED = /[\(\[]\s*(half|full|qtr|quarter|small|sm|medium|md|mid|large|lg|regular|reg|jumbo|family|mini|single|double)\s*[\)\]]/i;

// Composite portion: "Half Plate", "Full Thali", "Quarter Portion".
const PORTION_COMPOSITE = /\b(half|full|qtr|quarter|small|medium|large|jumbo|family|mini)\s+(plate|portion|thali|katori|tikki|bowl|glass|mug|cup|scoop|slice|piece)s?\b/i;

// Standalone portion at end of line.
const PORTION_TRAILING = /[\s\-–—_·]+(half|full|qtr|quarter|small|sm|medium|md|large|lg|regular|reg|jumbo|family|mini|single|double)\s*$/i;

// Standalone serving word at end ("Veg Thali", "Coffee Mug").
const SERVING_TRAILING = /[\s\-–—_·]+(plate|thali|bowl|glass|mug|cup|scoop|slice|piece)s?\s*$/i;

// "1/2" written for half.
const HALF_FRACTION = /\b1\s*\/\s*2\b/;

function normaliseNumericUnit(num: string, suffix: string): string {
  const n = num.replace(/\s+/g, '');
  const s = suffix.toLowerCase();
  const map: Record<string, string> = {
    millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml',
    l: 'l', ltr: 'l', litre: 'l', litres: 'l', liter: 'l', liters: 'l',
    g: 'g', gm: 'g', gms: 'g', gram: 'g', grams: 'g', gramme: 'g', grammes: 'g',
    kg: 'kg', kgs: 'kg', kilo: 'kg', kilogram: 'kg', kilograms: 'kg', kilogramme: 'kg', kilogrammes: 'kg',
    pc: 'pcs', pcs: 'pcs', piece: 'pcs', pieces: 'pcs',
    no: 'nos', nos: 'nos', 'no.': 'nos',
    inch: 'inch', inches: 'inch',
    cm: 'cm',
  };
  const tidy = map[s] ?? s;
  return `${n} ${tidy}`.replace(/\s+/g, ' ').replace(/(\d)\s+(ml|l|g|kg|cm)$/i, '$1$2');
}

function normalisePortion(word: string): string {
  const m: Record<string, string> = {
    sm: 'small', md: 'medium', mid: 'medium', lg: 'large', reg: 'regular', qtr: 'quarter',
  };
  const w = word.toLowerCase();
  return m[w] ?? w;
}

function extractUnit(rawName: string): { name: string; unit?: string } {
  let name = rawName;
  let unit: string | undefined;

  // 1) Numeric unit ("250 ml", "1kg") — most specific.
  let m = NUMERIC_UNIT.exec(name);
  if (m) {
    unit = normaliseNumericUnit(m[1], m[2]);
    name = (name.slice(0, m.index) + ' ' + name.slice(m.index + m[0].length)).trim();
  }

  // 2) "1/2" → "half".
  if (!unit && HALF_FRACTION.test(name)) {
    unit = 'half';
    name = name.replace(HALF_FRACTION, ' ');
  }

  // 3) Composite portion like "Half Plate".
  if (!unit) {
    m = PORTION_COMPOSITE.exec(name);
    if (m) {
      unit = `${normalisePortion(m[1])} ${m[2].toLowerCase()}`;
      name = (name.slice(0, m.index) + ' ' + name.slice(m.index + m[0].length)).trim();
    }
  }

  // 4) Bracketed portion: "(Half)", "[Regular]".
  if (!unit) {
    m = PORTION_BRACKETED.exec(name);
    if (m) {
      unit = normalisePortion(m[1]);
      name = (name.slice(0, m.index) + ' ' + name.slice(m.index + m[0].length)).trim();
    }
  }

  // 5) Trailing portion word: "Veg Biryani Half".
  if (!unit) {
    m = PORTION_TRAILING.exec(name);
    if (m) {
      unit = normalisePortion(m[1]);
      name = name.slice(0, m.index).trim();
    }
  }

  // 6) Trailing serving word: "Coffee Mug", "Mango Lassi Glass".
  if (!unit) {
    m = SERVING_TRAILING.exec(name);
    if (m) {
      unit = m[1].toLowerCase();
      name = name.slice(0, m.index).trim();
    }
  }

  return { name: cleanName(name), unit };
}

const SKIP_PREFIXES = [
  'menu', 'price', 'rate', 'item', 'starter', 'main', 'dessert', 'beverage',
  'breakfast', 'lunch', 'dinner', 'special', 'veg', 'non-veg', 'note', 'gst',
  'tax', 'total', 'thank', 'welcome', 'address', 'phone', 'mob', 'open', 'closed',
];

function looksLikeHeader(line: string): boolean {
  const lower = line.toLowerCase().trim();
  if (lower.length < 3) return true;
  if (SKIP_PREFIXES.some((p) => lower === p || lower.startsWith(p + ' ') || lower.startsWith(p + ':'))) {
    // header-like only if there's no price on the same line
    return !/\d{2,4}/.test(line);
  }
  return false;
}

function cleanName(s: string): string {
  return s
    // Decorative leaders / bullets / arrows / stars commonly seen on printed menus.
    .replace(/[._·•◉◆◇➤▶★☆●○✦*~]+/g, ' ')
    .replace(/[\-–—=]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\W+|\W+$/g, '')
    .trim();
}

// Tesseract often loses the period in "XX.00", returning "XX00" — a 4-digit
// integer ending in 00 within café-price range is almost always a decimal
// artefact. Above ₹999 also gets corrected (Magarpatta delivery items rarely
// exceed ₹999; if they do, the vendor edits the row).
function correctPrice(n: number): number {
  if (n > 999 && n % 100 === 0) return Math.floor(n / 100);
  return n;
}

// Strip OCR garbage embedded in the name: when multiple columns get stitched
// together, the real item name is usually after the last embedded number-pair.
// "Pram bea 129 00 Pancer Butter Masala" → "Pancer Butter Masala".
function stripEmbeddedPrices(name: string): string {
  // Match any "NN" or "NN NN" or "NN.NN" not at the very start.
  let result = name;
  const re = /\b\d{2,4}(?:[.\s]+\d{1,2})?\b/g;
  let lastEnd = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(name)) !== null) {
    if (m.index > 0) lastEnd = m.index + m[0].length;
  }
  if (lastEnd > 0) result = name.slice(lastEnd).trim();
  return result;
}

// Reject lines that look like OCR noise rather than menu items: too few
// letters, or majority of words are 1-2 chars (a tell-tale of edge/border OCR).
function looksLikeNoise(s: string): boolean {
  const letters = s.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 4) return true;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const tiny = words.filter((w) => w.length <= 2).length;
  if (tiny / words.length > 0.55) return true;
  return false;
}

export function parseMenuText(raw: string): ParsedItem[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const items: ParsedItem[] = [];

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (looksLikeHeader(line)) continue;

    const m = PRICE_LINE.exec(line);
    if (!m) continue;

    const rawPrice = Number(m[2]);
    if (!Number.isFinite(rawPrice) || rawPrice < 10 || rawPrice > 9999) continue;
    const price = correctPrice(rawPrice);
    if (price < 5) continue;

    let rawName = cleanName(m[1]);
    // If the captured "name" still has embedded numbers (multi-column OCR
    // jumble), drop everything up to and including the last embedded price.
    rawName = stripEmbeddedPrices(rawName);
    rawName = cleanName(rawName);
    if (rawName.length < 2 || rawName.length > 80) continue;
    if (/^\d+$/.test(rawName)) continue;
    if (looksLikeNoise(rawName)) continue;

    const { name, unit } = extractUnit(rawName);
    if (name.length < 2) continue;
    if (looksLikeNoise(name)) continue;

    const key = name.toLowerCase() + '|' + price + '|' + (unit ?? '');
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({ name, priceInr: price, unit });
  }

  return items;
}

// Strip HTML to plain text — used for QR-scanned URLs that resolve to a menu
// page. Keeps line breaks around block-level tags so the line parser still has
// something to work with.
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/?(p|div|li|tr|td|th|h[1-6]|br|section|article)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n');
}
