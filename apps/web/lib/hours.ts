/**
 * Vendor operating hours — hardcoded by vendorType for now. Phase 2 will read
 * from a DB field + a per-vendor override. All times IST (Asia/Kolkata).
 */

interface DayHours { open: number; close: number; }

const HOURS_BY_TYPE: Record<string, DayHours> = {
  restaurant: { open: 10, close: 23 },
  cafe:       { open: 8,  close: 22 },
  bakery:     { open: 8,  close: 21 },
  sweets:     { open: 9,  close: 22 },
  grocery:    { open: 8,  close: 22 },
  meat:       { open: 9,  close: 20 },
  pharmacy:   { open: 9,  close: 22 },
};

const DEFAULT: DayHours = { open: 10, close: 22 };

function hoursFor(vendorType: string): DayHours {
  return HOURS_BY_TYPE[vendorType] ?? DEFAULT;
}

function istHour(): number {
  // IST = UTC+5:30. Floor-to-hour in IST regardless of server tz.
  const nowMs = Date.now() + 5.5 * 60 * 60 * 1000;
  return new Date(nowMs).getUTCHours();
}

function fmt(h: number): string {
  const suffix = h >= 12 && h < 24 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}${suffix}`;
}

export interface VendorOpenState {
  isOpen: boolean;
  label: string;           // "Open · closes at 10pm" or "Closed · opens at 9am"
  opensAt: number;         // 24h
  closesAt: number;        // 24h
}

export function openState(vendorType: string): VendorOpenState {
  const { open, close } = hoursFor(vendorType);
  const h = istHour();
  const isOpen = h >= open && h < close;
  return {
    isOpen,
    label: isOpen
      ? `Open now · closes at ${fmt(close)}`
      : `Closed · opens at ${fmt(open)}`,
    opensAt: open,
    closesAt: close,
  };
}
