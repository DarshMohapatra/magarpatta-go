'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart, cartSubtotalMrp, cartConvenience, cartCampaignSavings, cartHasCampaignDiscount, cartCampaignTitles, type JoinPlanIntent } from '@/lib/cart';
import { ProductGlyph } from '@/components/product-glyph';
import { cn } from '@/lib/utils';
import {
  GIFT_WRAP_FEE, INSURANCE_FEE, TAX_RATE,
} from '@/lib/pricing';

interface SlotDef {
  id: string;
  label: string;
  startMin: number;
  endMin: number;
  capacity: number;
}

interface CheckoutAddress {
  id: string;
  label: 'HOME' | 'WORK' | 'OTHER';
  society: string;
  building: string;
  flat: string;
  verified: boolean;
  isDefault: boolean;
}

interface Props {
  session: {
    phone: string;
    name: string | null;
    addresses: CheckoutAddress[];
  };
  cod: {
    eligible: boolean;
    maxOrderInr: number;
  };
  /** Resolved delivery fee for THIS customer — already factors in membership. */
  deliveryFeeInr: number;
  /** Where the fee came from. UI uses this to decide the banner copy. */
  feeSource: 'free' | 'post-included' | 'standard';
  /** Non-member fee (settings.delivery_fee_inr). Shown next to the strikethrough
   *  when a member sees ₹0. */
  standardFeeInr: number;
  /** Membership snapshot (null if customer isn't subscribed). */
  membership: {
    planName: string;
    creditsLeft: number;
    creditsGranted: number;
    postIncludedFeeInr: number;
  } | null;
  /** Whether the platform has any active top-ups — drives the "Recharge" CTA. */
  topUpsAvailable: boolean;
  /** Plan we'd offer if the user isn't a member. Null if they already are. */
  planOffer: {
    planId: string;
    name: string;
    priceInr: number;
    includedDeliveries: number;
    cycleDays: number;
    postIncludedFeeInr: number;
  } | null;
  /** Slot picker config. */
  slotOptions: {
    today: string;
    tomorrow: string;
    definitions: SlotDef[];
  };
}

type PaymentMethod = 'CARD' | 'UPI' | 'NET_BANKING' | 'COD';
type Step = 'cart' | 'address' | 'payment';

const BANKS = ['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'Yes'];

interface AppliedCoupon {
  code: string;
  description: string;
  type: 'PERCENT' | 'FLAT' | 'FREE_DELIVERY';
  discountInr: number;
  freeDelivery: boolean;
}

const STEPS: Step[] = ['cart', 'address', 'payment'];
const STEP_LABEL: Record<Step, string> = { cart: 'Cart', address: 'Address', payment: 'Payment' };

export function CheckoutClient({
  session,
  cod,
  deliveryFeeInr,
  feeSource,
  standardFeeInr,
  membership,
  topUpsAvailable,
  planOffer,
  slotOptions,
}: Props) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const increment = useCart((s) => s.increment);
  const decrement = useCart((s) => s.decrement);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);

  const [step, setStep] = useState<Step>('cart');
  const [notes, setNotes] = useState('');
  const [giftWrap, setGiftWrap] = useState(false);
  const [insurance, setInsurance] = useState(false);
  const [tip, setTip] = useState(0);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    session.addresses.find((a) => a.isDefault)?.id ?? session.addresses[0]?.id ?? null,
  );
  const selectedAddress = session.addresses.find((a) => a.id === selectedAddressId) ?? null;
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CARD');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bank, setBank] = useState(BANKS[0]);
  const [placing, setPlacing] = useState(false);
  const [processingLine, setProcessingLine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Delivery window. Order-now was retired for the wholesale launch — every
  // customer must pick a future slot. `deliveryWindow` stays as a state for
  // the API contract but is locked to SLOTTED.
  const deliveryWindow: 'SLOTTED' = 'SLOTTED';
  const [slotDate, setSlotDate] = useState<string>(slotOptions.today);
  const [slotId, setSlotId] = useState<string>('');
  const [slotAvailability, setSlotAvailability] = useState<Array<SlotDef & { booked: number; full: boolean; expired: boolean }>>([]);
  const [slotLoading, setSlotLoading] = useState(false);

  // Cart revalidation — drop OOS items and surface price changes before payment.
  const [revalidated, setRevalidated] = useState(false);
  const [priceChanges, setPriceChanges] = useState<Array<{ name: string; oldPriceInr: number; newPriceInr: number }>>([]);
  const [removedOos, setRemovedOos] = useState<string[]>([]);

  // One revalidation per checkout-page entry. Runs once when the cart has
  // items; future cart edits go through the normal client-side flow. We
  // depend only on `revalidated` (a flag we set when the call finishes) so
  // Zustand's per-render array reference for `items` doesn't refire us.
  useEffect(() => {
    if (revalidated) return;
    const snapshot = useCart.getState().items;
    if (snapshot.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/cart/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: snapshot.map((i) => ({ id: i.id, priceInr: i.priceInr, mrpInr: i.mrpInr })) }),
        });
        const data = await res.json();
        if (!data.ok || cancelled) return;
        for (const o of data.oos as Array<{ id: string; name: string }>) {
          remove(o.id);
        }
        if (data.oos.length > 0) {
          setRemovedOos(data.oos.map((o: { name: string }) => o.name));
        }
        if (data.changed.length > 0) {
          setPriceChanges(data.changed);
        }
      } catch {
        /* server re-checks at placement anyway */
      } finally {
        if (!cancelled) setRevalidated(true);
      }
    })();
    return () => { cancelled = true; };
  }, [revalidated, remove]);

  useEffect(() => {
    if (slotOptions.definitions.length === 0) return;
    let cancelled = false;
    setSlotLoading(true);
    fetch(`/api/slots?date=${slotDate}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.ok) return;
        setSlotAvailability(data.slots);
        // Default to the first slot that isn't expired or full. The user
        // can change it; if there's nothing pickable on this date the
        // picker shows an empty-state message.
        setSlotId((cur) => {
          if (cur && (data.slots as Array<{ id: string; full: boolean; expired: boolean }>).some((s) => s.id === cur && !s.expired && !s.full)) {
            return cur;
          }
          const first = (data.slots as Array<{ id: string; full: boolean; expired: boolean }>).find((s) => !s.full && !s.expired);
          return first?.id ?? '';
        });
      })
      .catch(() => { /* ignore — picker shows empty state */ })
      .finally(() => { if (!cancelled) setSlotLoading(false); });
    return () => { cancelled = true; };
  }, [slotDate, slotOptions.definitions.length]);

  // Build 7 future dates client-side from the server-supplied today ISO so
  // wholesale customers can order ahead. Labels: Today, Tomorrow, then
  // "Mon 19 May" style.
  const dateOptions = useMemo(() => {
    const out: Array<{ iso: string; label: string }> = [];
    const [y, m, d] = slotOptions.today.split('-').map(Number);
    const base = new Date(y, (m ?? 1) - 1, d ?? 1);
    for (let i = 0; i < 7; i++) {
      const dt = new Date(base);
      dt.setDate(dt.getDate() + i);
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      out.push({ iso, label });
    }
    return out;
  }, [slotOptions.today]);

  const subtotal = useMemo(() => cartSubtotalMrp(items), [items]);
  const convenience = useMemo(() => cartConvenience(items), [items]);
  const campaignSavings = useMemo(() => cartCampaignSavings(items), [items]);
  const hasCampaign = useMemo(() => cartHasCampaignDiscount(items), [items]);
  const campaignTitles = useMemo(() => cartCampaignTitles(items), [items]);
  const tax = Math.round(subtotal * TAX_RATE);
  const addOns = (giftWrap ? GIFT_WRAP_FEE : 0) + (insurance ? INSURANCE_FEE : 0) + tip;
  // When a plan is being added to this order, member benefit kicks in
  // immediately: delivery on THIS order is free, and the plan price shows
  // as its own line in the total.
  const joiningPlan = useCart((s) => s.joinPlan);
  const baseDelivery = items.length === 0 ? 0 : joiningPlan ? 0 : deliveryFeeInr;
  const deliveryFee = coupon?.freeDelivery ? 0 : baseDelivery;
  const membershipFee = joiningPlan?.priceInr ?? 0;
  const discount = coupon?.discountInr ?? 0;
  const total = Math.max(0, subtotal + convenience + tax + addOns + deliveryFee + membershipFee - discount);

  // COD is only offered to customers who've completed enough prepaid orders
  // (or who admin has pre-approved), and only when this order's total is
  // within the COD ceiling. The reasoning isn't shown to the customer — the
  // tile simply doesn't appear when they aren't eligible.
  const codAvailable = cod.eligible && total <= cod.maxOrderInr;
  if (payMethod === 'COD' && !codAvailable) {
    setPayMethod('CARD');
  }

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch('/api/coupons/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotalInr: subtotal }),
      });
      const data = await res.json();
      if (!data.ok) {
        setCouponError(data.error ?? 'Invalid coupon');
        setCouponLoading(false);
        return;
      }
      setCoupon({
        code: data.coupon.code,
        description: data.coupon.description,
        type: data.coupon.type,
        discountInr: data.preview.discountInr,
        freeDelivery: Boolean(data.preview.freeDelivery),
      });
      setCouponInput('');
    } catch {
      setCouponError('Network error. Try again.');
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponError(null);
  }
  const hasAddress = Boolean(selectedAddress);

  function validatePayment(): string | null {
    if (payMethod === 'CARD') {
      const digits = cardNumber.replace(/\s/g, '');
      if (digits.length !== 16 || !/^\d+$/.test(digits)) return 'Enter a valid 16-digit card number';
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) return 'Expiry must be MM/YY';
      if (cardCvv.length !== 3) return 'CVV must be 3 digits';
      if (cardName.trim().length < 2) return 'Enter the name on your card';
    } else if (payMethod === 'UPI') {
      if (!/^[\w.-]+@[\w]+$/.test(upiId.trim())) return 'Enter a valid UPI ID (e.g. you@okhdfc)';
    }
    return null;
  }

  async function placeOrder() {
    const pErr = validatePayment();
    if (pErr) {
      setError(pErr);
      return;
    }
    setPlacing(true);
    setError(null);

    const steps =
      payMethod === 'CARD'
        ? ['Encrypting card details…', 'Authorising with your bank…', 'Payment captured.']
        : payMethod === 'UPI'
          ? [`Requesting UPI approval from ${upiId}…`, 'Awaiting your confirmation…', 'Payment received.']
          : payMethod === 'NET_BANKING'
            ? [`Redirecting to ${bank} Bank…`, 'Authorising transaction…', 'Payment received.']
            : ['Order noted — pay cash on arrival.'];

    for (const s of steps) {
      setProcessingLine(s);
      await new Promise((r) => setTimeout(r, payMethod === 'COD' ? 500 : 900));
    }

    if (deliveryWindow === 'SLOTTED' && !slotId) {
      setError('Pick a slot or switch to "Order now".');
      setPlacing(false);
      setProcessingLine(null);
      return;
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
          notes: notes.trim() || undefined,
          paymentMethod: payMethod,
          addressId: selectedAddressId,
          giftWrap,
          insurance,
          tipInr: tip,
          deliveryMode: 'standard',
          couponCode: coupon?.code,
          deliveryWindow,
          deliverySlotId: deliveryWindow === 'SLOTTED' ? slotId : undefined,
          deliverySlotDate: deliveryWindow === 'SLOTTED' ? slotDate : undefined,
          joinPlanId: joiningPlan?.planId,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? 'Could not place order');
        setPlacing(false);
        setProcessingLine(null);
        return;
      }
      clear();
      router.push(`/orders/${data.orderId}`);
    } catch {
      setError('Network error. Try again.');
      setPlacing(false);
      setProcessingLine(null);
    }
  }

  if (items.length === 0 && !placing) {
    return (
      <section className="pt-28 pb-24 min-h-[60vh]">
        <div className="mx-auto max-w-[720px] px-6 text-center">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Checkout</div>
          <h1 className="mt-4 font-serif text-[40px] sm:text-[52px] leading-[0.98] tracking-[-0.02em]">
            Your cart is <span className="italic text-[color:var(--color-forest)]">empty.</span>
          </h1>
          <Link href="/menu" className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full text-[14px] font-medium bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)]">
            Browse the menu
          </Link>
        </div>
      </section>
    );
  }

  const currentIdx = STEPS.indexOf(step);

  return (
    <>
      {placing && <ProcessingOverlay line={processingLine} method={payMethod} />}

      {/* Compact header (no overlap with navbar) */}
      <section className="pt-24 pb-6">
        <div className="mx-auto max-w-[1080px] px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--color-saffron)]">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="5" width="10" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M4.5 5V3.5a2.5 2.5 0 015 0V5" stroke="currentColor" strokeWidth="1.4" />
                </svg>
                Secure Checkout
              </div>
              <h1 className="mt-2 font-serif text-[32px] sm:text-[42px] leading-[1.02] tracking-[-0.02em]">
                Almost there,{' '}
                <span className="italic text-[color:var(--color-forest)]">
                  {session.name?.split(' ')[0] ?? 'neighbour'}.
                </span>
              </h1>
            </div>
            <div className="text-right text-[12px] text-[color:var(--color-ink-soft)]">
              Step {currentIdx + 1} of 3
            </div>
          </div>

          <StepIndicator current={currentIdx} />

          {/* Cart-revalidation banners — render once on load if anything changed. */}
          {removedOos.length > 0 && (
            <div className="mt-4 rounded-xl border border-[color:var(--color-terracotta)]/30 bg-[color:var(--color-terracotta)]/10 px-4 py-3 text-[13px] text-[color:var(--color-terracotta)]">
              Removed from your cart (out of stock): {removedOos.join(', ')}.
            </div>
          )}
          {priceChanges.length > 0 && (
            <div className="mt-4 rounded-xl border border-[color:var(--color-saffron)]/35 bg-[color:var(--color-saffron)]/10 px-4 py-3 text-[13px]">
              Prices updated since you added these items:
              <ul className="mt-1.5 list-disc pl-5">
                {priceChanges.map((c) => (
                  <li key={c.name}>{c.name}: ₹{c.oldPriceInr} → <strong>₹{c.newPriceInr}</strong></li>
                ))}
              </ul>
            </div>
          )}

          {/* Membership status banner */}
          {membership && feeSource === 'free' && (
            <div className="mt-4 rounded-xl border border-[color:var(--color-forest)]/30 bg-[color:var(--color-forest)]/8 px-4 py-3 text-[13px]">
              <strong>{membership.planName}</strong> — delivery free on this order. {membership.creditsLeft} of {membership.creditsGranted} credits left this cycle.
            </div>
          )}
          {membership && feeSource === 'post-included' && (
            <div className="mt-4 rounded-xl border border-[color:var(--color-saffron)]/40 bg-[color:var(--color-saffron)]/10 px-4 py-3 text-[13px] flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>{membership.planName}</strong> — you've used all free deliveries. This order is ₹{membership.postIncludedFeeInr}.
              </span>
              {topUpsAvailable && (
                <Link href="/account/membership" className="underline text-[color:var(--color-forest)]">Recharge to keep saving →</Link>
              )}
            </div>
          )}
          {!membership && joiningPlan && (
            <div className="mt-4 rounded-xl border border-[color:var(--color-forest)]/30 bg-[color:var(--color-forest)]/8 px-4 py-3 text-[13px] flex flex-wrap items-center justify-between gap-3">
              <span>
                <strong>{joiningPlan.name}</strong> added to this order — delivery free starting now. {joiningPlan.includedDeliveries - 1} free deliveries left after this one.
              </span>
              <button
                onClick={() => useCart.getState().removePlanFromCart()}
                className="text-[12px] text-[color:var(--color-terracotta)] hover:underline"
              >
                Remove plan
              </button>
            </div>
          )}
          {!membership && !joiningPlan && planOffer && (
            <div className="mt-4 rounded-xl border border-[color:var(--color-forest)]/25 bg-[color:var(--color-forest)]/5 px-4 py-3 text-[13px] flex flex-wrap items-center justify-between gap-3">
              <span>
                Add <strong>{planOffer.name}</strong> (₹{planOffer.priceInr}) to this order — {planOffer.includedDeliveries} free deliveries including this one.
              </span>
              <button
                onClick={() => useCart.getState().addPlanToCart({
                  planId: planOffer.planId,
                  name: planOffer.name,
                  priceInr: planOffer.priceInr,
                  includedDeliveries: planOffer.includedDeliveries,
                  cycleDays: planOffer.cycleDays,
                })}
                className="rounded-md bg-[color:var(--color-forest)] text-white px-3 py-1.5 text-[12.5px] font-medium hover:opacity-90"
              >
                Add to order
              </button>
            </div>
          )}
          {!membership && !planOffer && (
            <div className="mt-4 rounded-xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] px-4 py-3 text-[13px]">
              Delivery fee on this order: <strong>₹{standardFeeInr}</strong>.
            </div>
          )}

          {/* Delivery slot picker — wholesale launch is slot-only, no
             same-hour "Order now" path. Customer must pick a future window
             that hasn't hit its cutoff yet. */}
          {items.length > 0 && (
            <div className="mt-5 rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-5">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Pick a delivery slot</div>
              <p className="mt-1 text-[12px] text-[color:var(--color-ink-soft)]">
                Choose any day this week. Slots close before they start — orders for the morning slot must be placed before 6 PM the previous day.
              </p>

              {slotOptions.definitions.length === 0 ? (
                <p className="mt-4 text-[12.5px] text-[color:var(--color-ink-soft)] italic">
                  No delivery slots configured yet. Please contact support.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {/* Date row — 7 days */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {dateOptions.map((d) => (
                      <button
                        key={d.iso}
                        onClick={() => { setSlotDate(d.iso); setSlotId(''); }}
                        className={cn(
                          'rounded-md px-3 py-1.5 text-[12px] border whitespace-nowrap shrink-0',
                          slotDate === d.iso
                            ? 'bg-[color:var(--color-forest)] text-white border-[color:var(--color-forest)]'
                            : 'border-[color:var(--color-ink)]/15 hover:border-[color:var(--color-forest)]/40',
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>

                  {/* Slot row */}
                  {slotLoading ? (
                    <p className="text-[12px] text-[color:var(--color-ink-soft)]">Loading slots…</p>
                  ) : (() => {
                    const usable = slotAvailability.filter((s) => !s.expired);
                    if (usable.length === 0) {
                      return (
                        <p className="text-[12.5px] text-[color:var(--color-ink-soft)] italic">
                          All slots for this day have closed. Pick a later date above.
                        </p>
                      );
                    }
                    return (
                      <div className="grid sm:grid-cols-2 gap-2">
                        {usable.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setSlotId(s.id)}
                            className={cn(
                              'rounded-lg px-3 py-2.5 text-left border text-[13px]',
                              slotId === s.id
                                ? 'border-[color:var(--color-forest)] bg-[color:var(--color-forest)]/8'
                                : 'border-[color:var(--color-ink)]/15 hover:border-[color:var(--color-forest)]/40',
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Step content */}
      <section className="pb-20">
        <div className="mx-auto max-w-[1080px] px-4 sm:px-6 lg:px-10">
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 lg:gap-8">
            <div className="space-y-6 min-w-0">
              {step === 'cart' && (
                <CartStep
                  items={items}
                  increment={increment}
                  decrement={decrement}
                  remove={remove}
                  onNext={() => setStep(hasAddress ? 'address' : 'address')}
                />
              )}

              {step === 'address' && (
                <AddressStep
                  session={session}
                  selectedAddressId={selectedAddressId}
                  setSelectedAddressId={setSelectedAddressId}
                  notes={notes}
                  setNotes={setNotes}
                  onBack={() => setStep('cart')}
                  onNext={() => hasAddress && setStep('payment')}
                  hasAddress={hasAddress}
                />
              )}

              {step === 'payment' && (
                <PaymentStep
                  payMethod={payMethod}
                  setPayMethod={setPayMethod}
                  codAvailable={codAvailable}
                  cardNumber={cardNumber}
                  setCardNumber={setCardNumber}
                  cardExpiry={cardExpiry}
                  setCardExpiry={setCardExpiry}
                  cardCvv={cardCvv}
                  setCardCvv={setCardCvv}
                  cardName={cardName}
                  setCardName={setCardName}
                  upiId={upiId}
                  setUpiId={setUpiId}
                  bank={bank}
                  setBank={setBank}
                  giftWrap={giftWrap}
                  setGiftWrap={setGiftWrap}
                  insurance={insurance}
                  setInsurance={setInsurance}
                  tip={tip}
                  setTip={setTip}
                  error={error}
                  onBack={() => setStep('address')}
                  onSubmit={placeOrder}
                  total={total}
                />
              )}
            </div>

            {/* Sticky totals sidebar */}
            <aside className="lg:sticky lg:top-24 lg:self-start rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-5 sm:p-6 shadow-[0_12px_40px_-20px_rgba(13,74,46,0.16)]">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">Order total</div>
              <div className="mt-3 space-y-1.5 text-[13px]">
                <Row label="Subtotal (MRP)" value={`₹${subtotal + campaignSavings}`} />
                {campaignSavings > 0 && (
                  <div className="flex items-center justify-between text-[color:var(--color-forest)]">
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span className="rounded-md bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] font-semibold shrink-0">
                        Sale
                      </span>
                      <span className="truncate">{campaignTitles.join(' · ') || 'Campaign discount'}</span>
                    </span>
                    <span>−₹{campaignSavings}</span>
                  </div>
                )}
                {convenience > 0 && (
                  <Row label="Convenience fee" value={`₹${convenience}`} />
                )}
                <Row label="Tax (5%)" value={`₹${tax}`} />
                {giftWrap && <Row label="Gift wrap" value={`₹${GIFT_WRAP_FEE}`} />}
                {insurance && <Row label="Insurance" value={`₹${INSURANCE_FEE}`} />}
                {tip > 0 && <Row label="Rider tip" value={`₹${tip}`} />}
                <Row
                  label="Delivery"
                  value={coupon?.freeDelivery ? 'FREE' : deliveryFee === 0 && (membership || joiningPlan) ? 'FREE · Member' : `₹${deliveryFee}`}
                />
                {joiningPlan && (
                  <Row label={joiningPlan.name} value={`₹${joiningPlan.priceInr}`} />
                )}
                {discount > 0 && (
                  <div className="flex items-center justify-between text-[color:var(--color-forest)]">
                    <span>{coupon?.code} discount</span>
                    <span>−₹{discount}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-[color:var(--color-ink)]/10 flex items-center justify-between">
                <span className="font-serif text-[18px]">Total</span>
                <span className="font-serif text-[30px] leading-none text-[color:var(--color-forest)]">₹{total}</span>
              </div>

              {/* Coupon input */}
              <div className="mt-4 pt-4 border-t border-[color:var(--color-ink)]/8">
                {hasCampaign ? (
                  <div className="rounded-xl bg-[color:var(--color-forest)]/5 border border-[color:var(--color-forest)]/20 p-3">
                    <div className="text-[12.5px] text-[color:var(--color-forest)] font-medium">
                      Already saving with {campaignTitles[0] ?? 'a campaign'}
                    </div>
                    <div className="mt-1 text-[11.5px] text-[color:var(--color-ink-soft)]">
                      Coupon codes can&apos;t stack on top of an active sale. Save ₹{campaignSavings} this order.
                    </div>
                  </div>
                ) : coupon ? (
                  <div className="rounded-xl bg-[color:var(--color-forest)]/5 border border-[color:var(--color-forest)]/20 p-3 flex items-start gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] shrink-0">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[color:var(--color-forest)]">{coupon.code}</div>
                      <div className="text-[11.5px] text-[color:var(--color-ink-soft)] truncate">{coupon.description}</div>
                    </div>
                    <button onClick={removeCoupon} className="text-[11px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-terracotta)] underline underline-offset-2 shrink-0">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                        onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                        placeholder="Enter coupon code"
                        className="flex-1 rounded-lg border border-[color:var(--color-ink)]/12 bg-[color:var(--color-cream)] px-3 py-2 text-[13px] uppercase outline-none focus:border-[color:var(--color-forest)] placeholder:text-[color:var(--color-ink-soft)]/55"
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={couponLoading || !couponInput}
                        className={cn(
                          'rounded-lg px-4 text-[13px] font-medium transition-colors',
                          couponInput && !couponLoading
                            ? 'bg-[color:var(--color-ink)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest)]'
                            : 'bg-[color:var(--color-ink)]/10 text-[color:var(--color-ink-soft)]/50 cursor-not-allowed',
                        )}
                      >
                        {couponLoading ? '…' : 'Apply'}
                      </button>
                    </div>
                    {couponError && <p className="mt-2 text-[11.5px] text-[color:var(--color-terracotta-dark)]">{couponError}</p>}
                    <details className="mt-3 text-[11.5px] text-[color:var(--color-ink-soft)]/70">
                      <summary className="cursor-pointer hover:text-[color:var(--color-forest)]">Try one · tap to copy</summary>
                      <div className="mt-2 space-y-1.5 pl-2">
                        {[
                          { c: 'WELCOME10', d: '10% off · max ₹60' },
                          { c: 'SAVE50',    d: '₹50 off above ₹499' },
                          { c: 'FREEDEL',   d: 'Free delivery above ₹299' },
                          { c: 'MAGARPATTA20', d: '20% off · max ₹100' },
                          { c: 'JALEBI',    d: '₹30 off above ₹150' },
                        ].map((x) => (
                          <button
                            key={x.c}
                            type="button"
                            onClick={() => { setCouponInput(x.c); setCouponError(null); }}
                            className="block text-left font-mono text-[color:var(--color-forest)] hover:underline"
                          >
                            {x.c} <span className="font-sans text-[color:var(--color-ink-soft)]/75">· {x.d}</span>
                          </button>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/65">
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="5" width="10" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4.5 5V3.5a2.5 2.5 0 015 0V5" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                256-bit encrypted · demo gateway
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}

// ──────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 sm:gap-4 mb-2 overflow-x-auto">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s} className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11.5px] font-semibold transition-colors',
                  done
                    ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)]'
                    : active
                      ? 'bg-[color:var(--color-gold)] text-[color:var(--color-ink)]'
                      : 'bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink-soft)]/55',
                )}
              >
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={cn(
                'text-[12px] sm:text-[13px] font-medium uppercase tracking-[0.06em] truncate',
                active ? 'text-[color:var(--color-ink)]' : done ? 'text-[color:var(--color-ink-soft)]' : 'text-[color:var(--color-ink-soft)]/50',
              )}>
                {STEP_LABEL[s]}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'flex-1 h-px min-w-4',
                done ? 'bg-[color:var(--color-forest)]/35' : 'bg-[color:var(--color-ink)]/10',
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CartStep({ items, increment, decrement, remove, onNext }: {
  items: ReturnType<typeof useCart.getState>['items'];
  increment: (id: string) => void;
  decrement: (id: string) => void;
  remove: (id: string) => void;
  onNext: () => void;
}) {
  return (
    <>
      <Card label="Your cart">
        <ul className="divide-y divide-[color:var(--color-ink)]/8">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 sm:gap-4 py-3 first:pt-0">
              <div className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-xl overflow-hidden relative"
                style={{ backgroundColor: `color-mix(in srgb, var(--color-${it.accent ?? 'forest'}) 12%, transparent)` }}>
                {it.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt={it.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center scale-[0.45]">
                    <ProductGlyph glyph={it.glyph} accent={it.accent} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[14.5px] truncate">{it.name}</div>
                <div className="text-[12px] text-[color:var(--color-ink-soft)] truncate">
                  {it.vendorName}
                  {it.unit && <span> · {it.unit}</span>}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="inline-flex items-center rounded-full border border-[color:var(--color-ink)]/15 bg-[color:var(--color-paper)]">
                    <button onClick={() => decrement(it.id)} className="h-7 w-7 text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">−</button>
                    <span className="w-6 text-center text-[12.5px] font-medium">{it.qty}</span>
                    <button onClick={() => increment(it.id)} className="h-7 w-7 text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]">+</button>
                  </div>
                  <button onClick={() => remove(it.id)} className="text-[11px] text-[color:var(--color-ink-soft)]/60 hover:text-[color:var(--color-terracotta)] underline underline-offset-2">
                    remove
                  </button>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={cn('font-serif text-[16px]', it.originalMrpInr ? 'text-[color:var(--color-terracotta)]' : '')}>
                  ₹{it.mrpInr * it.qty}
                </div>
                {it.originalMrpInr && it.originalMrpInr > it.mrpInr && (
                  <div className="text-[11px] text-[color:var(--color-ink-soft)]/55 line-through">
                    ₹{it.originalMrpInr * it.qty}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-between items-stretch sm:items-center">
        <Link href="/menu" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13.5px] text-[color:var(--color-ink)] hover:bg-[color:var(--color-ink)]/5 border border-[color:var(--color-ink)]/10">
          ← Continue shopping
        </Link>
        <button onClick={onNext} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-[14.5px] font-medium bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)]">
          Continue to address
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </>
  );
}

function AddressStep({ session, selectedAddressId, setSelectedAddressId, notes, setNotes, onBack, onNext, hasAddress }: {
  session: Props['session'];
  selectedAddressId: string | null;
  setSelectedAddressId: (id: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  hasAddress: boolean;
}) {
  return (
    <>
      <Card label="Delivery address">
        {session.addresses.length === 0 ? (
          <div className="rounded-xl border border-[color:var(--color-terracotta)]/30 bg-[color:var(--color-terracotta)]/5 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <div className="font-medium text-[color:var(--color-terracotta-dark)]">No delivery address yet</div>
              <div className="text-[13px] text-[color:var(--color-ink-soft)]">Add your first address to continue.</div>
            </div>
            <Link href="/account/addresses?return=/checkout" className="shrink-0 px-4 py-2 rounded-full text-[13px] font-medium bg-[color:var(--color-forest)] text-[color:var(--color-cream)]">
              Add address
            </Link>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {session.addresses.map((a) => {
              const active = a.id === selectedAddressId;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedAddressId(a.id)}
                    className={cn(
                      'w-full text-left rounded-xl border-2 p-4 transition-colors flex items-start justify-between gap-4',
                      active
                        ? 'border-[color:var(--color-forest)] bg-[color:var(--color-forest)]/5'
                        : 'border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] hover:border-[color:var(--color-forest)]/40',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-full bg-[color:var(--color-ink)]/8 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] font-medium text-[color:var(--color-ink-soft)]">
                          {a.label === 'HOME' ? 'Home' : a.label === 'WORK' ? 'Work' : 'Other'}
                        </span>
                        {a.isDefault && (
                          <span className="rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] font-medium">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 text-[14px] font-medium text-[color:var(--color-ink)]">
                        Flat {a.flat}, {a.building}
                      </div>
                      <div className="text-[13px] text-[color:var(--color-ink-soft)]">{a.society}</div>
                      <div className="mt-1 text-[11.5px] text-[color:var(--color-ink-soft)]/75">+91 {session.phone}</div>
                    </div>
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                        active
                          ? 'bg-[color:var(--color-forest)] border-[color:var(--color-forest)] text-[color:var(--color-cream)]'
                          : 'border-[color:var(--color-ink)]/20',
                      )}
                    >
                      {active && (
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                          <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
            <li>
              <Link
                href="/account/addresses?return=/checkout"
                className="block rounded-xl border border-dashed border-[color:var(--color-ink)]/20 px-4 py-3 text-[13px] text-[color:var(--color-forest)] hover:bg-[color:var(--color-forest)]/5 hover:border-[color:var(--color-forest)]/40"
              >
                + Add another address
              </Link>
            </li>
          </ul>
        )}
      </Card>

      <Card label="Delivery instructions (optional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Gate instructions, preferred entrance, rider notes…"
          rows={3}
          maxLength={280}
          className="w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-cream)] px-4 py-3 text-[13.5px] outline-none resize-none focus:border-[color:var(--color-forest)] placeholder:text-[color:var(--color-ink-soft)]/55"
        />
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-between items-stretch sm:items-center">
        <button onClick={onBack} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13.5px] text-[color:var(--color-ink)] hover:bg-[color:var(--color-ink)]/5 border border-[color:var(--color-ink)]/10">
          ← Back to cart
        </button>
        <button
          onClick={onNext}
          disabled={!hasAddress}
          className={cn(
            'inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full text-[14.5px] font-medium transition-colors',
            hasAddress
              ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)]'
              : 'bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink-soft)]/60 cursor-not-allowed',
          )}
        >
          Continue to payment
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </>
  );
}

function PaymentStep(props: {
  payMethod: PaymentMethod;
  setPayMethod: (m: PaymentMethod) => void;
  codAvailable: boolean;
  cardNumber: string;
  setCardNumber: (v: string) => void;
  cardExpiry: string;
  setCardExpiry: (v: string) => void;
  cardCvv: string;
  setCardCvv: (v: string) => void;
  cardName: string;
  setCardName: (v: string) => void;
  upiId: string;
  setUpiId: (v: string) => void;
  bank: string;
  setBank: (v: string) => void;
  giftWrap: boolean;
  setGiftWrap: (v: boolean) => void;
  insurance: boolean;
  setInsurance: (v: boolean) => void;
  tip: number;
  setTip: (v: number) => void;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
  total: number;
}) {
  const { payMethod, setPayMethod, codAvailable } = props;
  return (
    <>
      <Card label="Payment method">
        <div className={cn('grid gap-2.5 grid-cols-2', codAvailable ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
          <PayTile active={payMethod === 'CARD'} onClick={() => setPayMethod('CARD')} label="Card" icon={<CardIcon />} />
          <PayTile active={payMethod === 'UPI'} onClick={() => setPayMethod('UPI')} label="UPI" icon={<UpiIcon />} />
          <PayTile active={payMethod === 'NET_BANKING'} onClick={() => setPayMethod('NET_BANKING')} label="Net Banking" icon={<BankIcon />} />
          {codAvailable && (
            <PayTile active={payMethod === 'COD'} onClick={() => setPayMethod('COD')} label="Cash" icon={<CashIcon />} />
          )}
        </div>

        <div className="mt-5 rounded-xl bg-[color:var(--color-cream)] p-4 sm:p-5">
          {payMethod === 'CARD' && (
            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--color-ink-soft)]/80">Card details</div>
              <input
                inputMode="numeric"
                maxLength={19}
                value={props.cardNumber}
                onChange={(e) => props.setCardNumber(formatCard(e.target.value))}
                placeholder="Card number (16 digits)"
                className="w-full rounded-lg border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-3 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  inputMode="numeric"
                  maxLength={5}
                  value={props.cardExpiry}
                  onChange={(e) => props.setCardExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  className="rounded-lg border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-3 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
                />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={3}
                  value={props.cardCvv}
                  onChange={(e) => props.setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="•••"
                  className="rounded-lg border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-3 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
                />
              </div>
              <input
                value={props.cardName}
                onChange={(e) => props.setCardName(e.target.value)}
                placeholder="Cardholder name"
                className="w-full rounded-lg border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-3 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
              />
            </div>
          )}

          {payMethod === 'UPI' && (
            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--color-ink-soft)]/80">UPI ID</div>
              <input
                value={props.upiId}
                onChange={(e) => props.setUpiId(e.target.value)}
                placeholder="yourname@okhdfcbank"
                className="w-full rounded-lg border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-3 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
              />
              <p className="text-[11.5px] text-[color:var(--color-ink-soft)]">A collect request goes to your UPI app when you place the order.</p>
            </div>
          )}

          {payMethod === 'NET_BANKING' && (
            <div className="space-y-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--color-ink-soft)]/80">Choose your bank</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BANKS.map((b) => (
                  <button key={b} type="button" onClick={() => props.setBank(b)}
                    className={cn(
                      'rounded-lg px-3 py-2 text-[13px] border transition-colors',
                      props.bank === b
                        ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-[color:var(--color-forest)]'
                        : 'bg-[color:var(--color-paper)] border-[color:var(--color-ink)]/12 hover:border-[color:var(--color-forest)]/40',
                    )}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          {payMethod === 'COD' && (
            <div className="space-y-1.5">
              <div className="text-[14px] font-medium">Pay the rider in cash or UPI on delivery.</div>
              <p className="text-[12px] text-[color:var(--color-ink-soft)]">No online payment needed. Exact change appreciated.</p>
            </div>
          )}
        </div>
      </Card>

      <Card label="Add-ons">
        <div className="flex flex-wrap gap-5">
          <AddOnCheckbox label="Gift wrap" sub="+₹50" icon="🎁" checked={props.giftWrap} onChange={props.setGiftWrap} />
          <AddOnCheckbox label="Order insurance" sub="+₹100" icon="🛡" checked={props.insurance} onChange={props.setInsurance} />
        </div>
      </Card>

      <Card label="Tip the rider">
        <p className="text-[12.5px] text-[color:var(--color-ink-soft)] mb-3">
          100% goes to your rider. A small tip goes a long way for neighbours cycling through Pune heat.
        </p>
        <div className="flex flex-wrap gap-2">
          {[0, 10, 20, 50].map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => props.setTip(amount)}
              className={cn(
                'px-4 py-2 rounded-full text-[13px] border transition-colors',
                props.tip === amount
                  ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-[color:var(--color-forest)]'
                  : 'bg-[color:var(--color-paper)] text-[color:var(--color-ink)] border-[color:var(--color-ink)]/12 hover:border-[color:var(--color-forest)]/40',
              )}
            >
              {amount === 0 ? 'No tip' : `₹${amount}`}
            </button>
          ))}
        </div>
      </Card>

      {props.error && (
        <div className="rounded-xl bg-[color:var(--color-terracotta)]/10 border border-[color:var(--color-terracotta)]/25 px-4 py-3 text-[13px] text-[color:var(--color-terracotta-dark)]">
          {props.error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-between items-stretch sm:items-center">
        <button onClick={props.onBack} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13.5px] text-[color:var(--color-ink)] hover:bg-[color:var(--color-ink)]/5 border border-[color:var(--color-ink)]/10">
          ← Back
        </button>
        <button
          onClick={props.onSubmit}
          className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full text-[15px] font-semibold bg-gradient-to-r from-[color:var(--color-forest)] to-[color:var(--color-moss)] text-[color:var(--color-cream)] hover:shadow-[0_12px_24px_-8px_rgba(13,74,46,0.4)] transition-shadow"
        >
          Place order · ₹{props.total}
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </>
  );
}

function ProcessingOverlay({ line, method }: { line: string | null; method: PaymentMethod }) {
  return (
    <div className="fixed inset-0 z-[80] bg-[color:var(--color-ink)]/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-[color:var(--color-paper)] rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
        <div className="mx-auto h-16 w-16 rounded-full bg-[color:var(--color-forest)]/10 flex items-center justify-center mb-5">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="animate-spin text-[color:var(--color-forest)]">
            <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2.5" fill="none" strokeDasharray="52" strokeDashoffset="22" strokeLinecap="round" />
          </svg>
        </div>
        <p className="font-serif text-[24px] leading-tight text-[color:var(--color-ink)]">
          {method === 'COD' ? 'Placing your order…' : 'Processing payment…'}
        </p>
        {line && <p className="mt-3 text-[13.5px] text-[color:var(--color-ink-soft)]">{line}</p>}
        <p className="mt-6 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/60">
          Demo gateway · no real charge
        </p>
      </div>
    </div>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-5 sm:p-6 shadow-[0_6px_20px_-12px_rgba(14,17,12,0.08)]">
      <div className="text-[14px] font-semibold text-[color:var(--color-ink)] mb-4">{label}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[color:var(--color-ink-soft)]">{label}</span>
      <span className="text-[color:var(--color-ink)]">{value}</span>
    </div>
  );
}

function PayTile({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        'rounded-xl border-2 px-3 py-3 sm:px-4 sm:py-4 flex flex-col items-center gap-2 transition-all',
        active ? 'border-[color:var(--color-forest)] bg-[color:var(--color-forest)]/5' : 'border-[color:var(--color-ink)]/10 hover:border-[color:var(--color-forest)]/30',
      )}>
      <span className={cn('text-[color:var(--color-forest)]', !active && 'opacity-70')}>{icon}</span>
      <div className="text-[12.5px] sm:text-[13px] font-medium text-[color:var(--color-ink)]">{label}</div>
    </button>
  );
}

function AddOnCheckbox({ label, sub, checked, onChange, icon }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void; icon: string }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <span className="h-4 w-4 rounded border-2 border-[color:var(--color-ink)]/30 peer-checked:bg-[color:var(--color-forest)] peer-checked:border-[color:var(--color-forest)] flex items-center justify-center transition-colors">
        {checked && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="text-[color:var(--color-cream)]">
            <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-[13px]"><span className="mr-1">{icon}</span>{label}<span className="ml-1 text-[color:var(--color-ink-soft)]">({sub})</span></span>
    </label>
  );
}

function formatCard(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.match(/.{1,4}/g)?.join(' ') ?? digits;
}
function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

const CardIcon = () => <svg width="22" height="22" viewBox="0 0 28 28" fill="none"><rect x="3" y="7" width="22" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" /><line x1="3" y1="12" x2="25" y2="12" stroke="currentColor" strokeWidth="1.8" /><line x1="7" y1="17" x2="12" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
const UpiIcon = () => <svg width="22" height="22" viewBox="0 0 28 28" fill="none"><rect x="8" y="3" width="12" height="22" rx="2.5" stroke="currentColor" strokeWidth="1.8" /><circle cx="14" cy="21" r="1" fill="currentColor" /></svg>;
const BankIcon = () => <svg width="22" height="22" viewBox="0 0 28 28" fill="none"><path d="M14 4l10 5H4l10-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M6 11v9M11 11v9M17 11v9M22 11v9M3 23h22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
const CashIcon = () => <svg width="22" height="22" viewBox="0 0 28 28" fill="none"><rect x="3" y="8" width="22" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.8" /><circle cx="14" cy="14" r="3" stroke="currentColor" strokeWidth="1.8" /></svg>;
