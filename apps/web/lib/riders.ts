/**
 * Phase 1 rider roster — 4 neighbours cycling Magarpatta. Hardcoded until
 * Phase 2 when we add a proper Rider model + onboarding flow.
 */

export interface Rider {
  phone: string;        // 10-digit, no +91
  name: string;
  perDropInr: number;   // flat earning per delivered order
}

export const RIDERS: Rider[] = [
  { phone: '8888888801', name: 'Akash M.', perDropInr: 30 },
  { phone: '8888888802', name: 'Priya S.', perDropInr: 30 },
  { phone: '8888888803', name: 'Rohan D.', perDropInr: 30 },
  { phone: '8888888804', name: 'Neha K.',  perDropInr: 30 },
];

export function findRider(phone: string): Rider | null {
  return RIDERS.find((r) => r.phone === phone) ?? null;
}
