'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, cartSubtotal } from '@/lib/cart';
import { ProductGlyph } from '@/components/product-glyph';
import { cn } from '@/lib/utils';

interface Props {
  session: {
    phone: string;
    name: string | null;
    society: string | null;
    building: string | null;
    flat: string | null;
  };
}

type PaymentMethod = 'CARD' | 'UPI' | 'NET_BANKING' | 'COD';

const TAX_RATE = 0.05;
const DELIVERY_FEE = 25;
const GIFT_WRAP_FEE = 50;
const INSURANCE_FEE = 100;

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra', 'Yes Bank'];

export function CheckoutClient({ session }: Props) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);

  // Form state
  const [notes, setNotes] = useState('');
  const [giftWrap, setGiftWrap] = useState(false);
  const [insurance, setInsurance] = useState(false);
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

  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const tax = Math.round(subtotal * TAX_RATE);
  const addOns = (giftWrap ? GIFT_WRAP_FEE : 0) + (insurance ? INSURANCE_FEE : 0);
  const deliveryFee = items.length > 0 ? DELIVERY_FEE : 0;
  const total = subtotal + tax + addOns + deliveryFee;

  const hasAddress = Boolean(session.society && session.building && session.flat);
  const estDeliveryTime = useMemo(() => new Date(Date.now() + 25 * 60 * 1000), []);

  function validatePayment(): string | null {
    if (payMethod === 'CARD') {
      const digits = cardNumber.replace(/\s/g, '');
      if (digits.length !== 16 || !/^\d+$/.test(digits)) return 'Enter a valid 16-digit card number';
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) return 'Expiry must be MM/YY';
      if (cardCvv.length !== 3 || !/^\d+$/.test(cardCvv)) return 'CVV must be 3 digits';
      if (cardName.trim().length < 2) return 'Enter the name on your card';
    } else if (payMethod === 'UPI') {
      if (!/^[\w.-]+@[\w]+$/.test(upiId.trim())) return 'Enter a valid UPI ID (e.g. you@okhdfc)';
    }
    return null;
  }

  async function placeOrder() {
    if (items.length === 0) return;
    if (!hasAddress) {
      setError('Please set a delivery address first.');
      return;
    }
    const pErr = validatePayment();
    if (pErr) {
      setError(pErr);
      return;
    }

    setPlacing(true);
    setError(null);

    // Simulate payment processing with realistic messaging
    const processingSteps: string[] =
      payMethod === 'CARD'
        ? ['Encrypting card details…', 'Authorising with your bank…', 'Payment captured.']
        : payMethod === 'UPI'
          ? [`Requesting UPI approval from ${upiId}…`, 'Awaiting your confirmation…', 'Payment received.']
          : payMethod === 'NET_BANKING'
            ? [`Redirecting to ${bank}…`, 'Authorising transaction…', 'Payment received.']
            : ['Order noted — pay cash on arrival.'];

    for (const step of processingSteps) {
      setProcessingLine(step);
      await new Promise((r) => setTimeout(r, payMethod === 'COD' ? 500 : 900));
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
          notes: notes.trim() || undefined,
          paymentMethod: payMethod,
          giftWrap,
          insurance,
          deliveryMode: 'standard',
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

  if (items.length === 0) {
    return (
      <section className="pt-28 pb-24 min-h-[60vh]">
        <div className="mx-auto max-w-[720px] px-6 lg:px-10 text-center">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Checkout</div>
          <h1 className="mt-4 font-serif text-[44px] leading-[0.98] tracking-[-0.02em]">
            Your cart is <span className="italic text-[color:var(--color-forest)]">empty.</span>
          </h1>
          <p className="mt-4 text-[14.5px] text-[color:var(--color-ink-soft)]">Add something from the menu and come back here.</p>
          <a href="/menu" className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full text-[14px] font-medium bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)]">
            Browse the menu
          </a>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Processing overlay */}
      {placing && (
        <div className="fixed inset-0 z-[80] bg-[color:var(--color-ink)]/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[color:var(--color-paper)] rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
            <div className="mx-auto h-16 w-16 rounded-full bg-[color:var(--color-forest)]/10 flex items-center justify-center mb-5">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="animate-spin text-[color:var(--color-forest)]">
                <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2.5" fill="none" strokeDasharray="52" strokeDashoffset="22" strokeLinecap="round" />
              </svg>
            </div>
            <p className="font-serif text-[24px] leading-tight text-[color:var(--color-ink)]">
              {payMethod === 'COD' ? 'Placing your order…' : 'Processing payment…'}
            </p>
            {processingLine && (
              <p className="mt-3 text-[13.5px] text-[color:var(--color-ink-soft)]">{processingLine}</p>
            )}
            <p className="mt-6 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/60">
              Demo gateway · no real charge
            </p>
          </div>
        </div>
      )}

      {/* Green header bar */}
      <section className="relative bg-gradient-to-r from-[color:var(--color-forest-dark)] via-[color:var(--color-forest)] to-[color:var(--color-moss)] text-[color:var(--color-cream)] pt-24 pb-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(600px 300px at 20% 0%, var(--color-gold), transparent 60%), radial-gradient(500px 300px at 80% 100%, var(--color-coral), transparent 60%)' }}
        />
        <div className="relative mx-auto max-w-[1080px] px-6 lg:px-10 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="6" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M6 6V4a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-gold)]">Secure Checkout</span>
            </div>
            <h1 className="mt-3 font-serif text-[40px] sm:text-[52px] leading-[0.98] tracking-[-0.02em]">
              Almost there,{' '}
              <span className="italic text-[color:var(--color-saffron-soft)]">
                {session.name?.split(' ')[0] ?? 'neighbour'}.
              </span>
            </h1>
          </div>
        </div>
      </section>

      <section className="pb-24 -mt-8">
        <div className="mx-auto max-w-[1080px] px-6 lg:px-10 grid lg:grid-cols-[1.4fr_1fr] gap-8">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Address */}
            <Card label="Select Delivery Address">
              {hasAddress ? (
                <div className="rounded-xl border-2 border-[color:var(--color-forest)] bg-[color:var(--color-forest)]/5 p-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-[color:var(--color-ink)]">{session.name ?? 'Your address'}</div>
                    <div className="mt-1 text-[14px] text-[color:var(--color-ink-soft)]">
                      Flat {session.flat}, {session.building}
                    </div>
                    <div className="text-[14px] text-[color:var(--color-ink-soft)]">
                      {session.society}, Magarpatta City
                    </div>
                    <div className="text-[14px] text-[color:var(--color-ink-soft)]">Pune, Maharashtra · 411028</div>
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] shrink-0">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              ) : (
                <div className="rounded-xl border border-[color:var(--color-terracotta)]/30 bg-[color:var(--color-terracotta)]/5 p-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium text-[color:var(--color-terracotta)]">No delivery address yet</div>
                    <div className="text-[13px] text-[color:var(--color-ink-soft)]">Set your society, building and flat.</div>
                  </div>
                  <a href="/signup" className="shrink-0 px-4 py-2 rounded-full text-[13px] font-medium bg-[color:var(--color-forest)] text-[color:var(--color-cream)]">
                    Set address
                  </a>
                </div>
              )}
            </Card>

            {/* Order summary */}
            <Card label={`${items.length} item${items.length === 1 ? '' : 's'} in order`}>
              <ul className="divide-y divide-[color:var(--color-ink)]/8">
                {items.map((it) => (
                  <li key={it.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <div
                      className="h-14 w-14 shrink-0 rounded-xl flex items-center justify-center overflow-hidden relative"
                      style={{ backgroundColor: `color-mix(in srgb, var(--color-${it.accent ?? 'forest'}) 12%, transparent)` }}
                    >
                      {it.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.imageUrl} alt={it.name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="scale-[0.45]"><ProductGlyph glyph={it.glyph} accent={it.accent} /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[15px] text-[color:var(--color-ink)] truncate">
                        {it.name} <span className="text-[color:var(--color-ink-soft)]">×{it.qty}</span>
                      </div>
                      <div className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] text-[color:var(--color-forest)]">
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                          <path d="M2 12V7h11l4 3v2h-3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                          <circle cx="6" cy="14" r="1.8" stroke="currentColor" strokeWidth="1.4" />
                          <circle cx="15" cy="14" r="1.8" stroke="currentColor" strokeWidth="1.4" />
                        </svg>
                        Est. arrival: {estDeliveryTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-right font-medium">₹{it.priceInr * it.qty}.00</div>
                  </li>
                ))}
              </ul>

              <div className="mt-4 pt-4 border-t border-[color:var(--color-ink)]/8 space-y-1.5 text-[14px]">
                <Row label="Subtotal" value={`₹${subtotal}.00`} />
                <Row label="Tax (5% GST)" value={`₹${tax}.00`} />
                {addOns > 0 && <Row label="Add-ons" value={`₹${addOns}.00`} />}
                <Row label="Delivery fee" value={`₹${deliveryFee}.00`} />
                <div className="flex items-center justify-between pt-3 mt-2 border-t border-[color:var(--color-ink)]/8">
                  <span className="font-semibold text-[16px]">Total</span>
                  <span className="font-serif text-[24px] text-[color:var(--color-forest)]">₹{total}.00</span>
                </div>
              </div>
            </Card>

            {/* Delivery mode — hyper-local only */}
            <Card label="Delivery Method">
              <div className="grid grid-cols-3 gap-3">
                <DeliveryTile active label="Standard" sub="~25 min" icon={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M2 13V7h11l4 3v3h-3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                    <circle cx="7" cy="16" r="2" stroke="currentColor" strokeWidth="1.6" />
                    <circle cx="17" cy="16" r="2" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                } />
                <DeliveryTile disabled label="Priority" sub="Phase 2" icon={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="currentColor" fillOpacity="0.1" />
                  </svg>
                } />
                <DeliveryTile disabled label="Scheduled" sub="Phase 2" icon={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                } />
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Delivery instructions (optional) — gate pass, preferred entrance, rider notes…"
                rows={2}
                maxLength={280}
                className="mt-4 w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-cream)] px-4 py-3 text-[13.5px] outline-none resize-none focus:border-[color:var(--color-forest)] placeholder:text-[color:var(--color-ink-soft)]/60"
              />

              <div className="mt-4 rounded-xl bg-[color:var(--color-cream)] px-4 py-3 flex items-center gap-6 flex-wrap">
                <AddOnCheckbox label="Gift Wrap" sub="+₹50" checked={giftWrap} onChange={setGiftWrap} icon="🎁" />
                <AddOnCheckbox label="Insurance" sub="+₹100" checked={insurance} onChange={setInsurance} icon="🛡" />
              </div>
            </Card>

            {/* Payment method */}
            <Card label="Select Payment Method">
              <div className="grid grid-cols-2 gap-3">
                <PayTile active={payMethod === 'CARD'} onClick={() => setPayMethod('CARD')} label="Card" sub="Visa · Mastercard · Rupay" icon={<CardIcon />} />
                <PayTile active={payMethod === 'UPI'} onClick={() => setPayMethod('UPI')} label="UPI" sub="GPay · PhonePe · Paytm" icon={<UpiIcon />} />
                <PayTile active={payMethod === 'NET_BANKING'} onClick={() => setPayMethod('NET_BANKING')} label="Net Banking" sub="All major banks" icon={<BankIcon />} />
                <PayTile active={payMethod === 'COD'} onClick={() => setPayMethod('COD')} label="Cash on Delivery" sub="Pay the rider" icon={<CashIcon />} />
              </div>

              {/* Payment-specific form */}
              <div className="mt-5 rounded-xl bg-[color:var(--color-cream)] px-5 py-5">
                {payMethod === 'CARD' && (
                  <div className="space-y-3">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[color:var(--color-ink-soft)]/80 mb-1">Card Details</div>
                    <input
                      inputMode="numeric"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCard(e.target.value))}
                      placeholder="Card number (16 digits)"
                      className="w-full rounded-lg border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-3 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        inputMode="numeric"
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        className="rounded-lg border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-3 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
                      />
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={3}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        placeholder="•••"
                        className="rounded-lg border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-3 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
                      />
                    </div>
                    <input
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Cardholder name"
                      className="w-full rounded-lg border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-3 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
                    />
                  </div>
                )}

                {payMethod === 'UPI' && (
                  <div className="space-y-3">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[color:var(--color-ink-soft)]/80 mb-1">UPI ID</div>
                    <input
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="yourname@okhdfcbank"
                      className="w-full rounded-lg border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-4 py-3 text-[14px] outline-none focus:border-[color:var(--color-forest)]"
                    />
                    <p className="text-[12px] text-[color:var(--color-ink-soft)]">
                      A collect request will be sent to your UPI app on "Place order".
                    </p>
                  </div>
                )}

                {payMethod === 'NET_BANKING' && (
                  <div className="space-y-3">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[color:var(--color-ink-soft)]/80 mb-1">Choose your bank</div>
                    <div className="grid grid-cols-2 gap-2">
                      {BANKS.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBank(b)}
                          className={cn(
                            'rounded-lg px-3 py-2 text-[13px] text-left border transition-colors',
                            bank === b
                              ? 'bg-[color:var(--color-forest)] text-[color:var(--color-cream)] border-[color:var(--color-forest)]'
                              : 'bg-[color:var(--color-paper)] border-[color:var(--color-ink)]/12 hover:border-[color:var(--color-forest)]/40',
                          )}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {payMethod === 'COD' && (
                  <div className="space-y-2">
                    <div className="text-[14px] font-medium text-[color:var(--color-ink)]">Pay the rider in cash or UPI on delivery.</div>
                    <p className="text-[12.5px] text-[color:var(--color-ink-soft)]">
                      No online payment now. Please keep exact change if possible.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT — sticky summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6 space-y-4 shadow-[0_12px_40px_-20px_rgba(15,81,50,0.18)]">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">Order total</div>

            <div className="space-y-1.5 text-[13.5px]">
              <Row label="Subtotal" value={`₹${subtotal}.00`} />
              <Row label="Tax (5%)" value={`₹${tax}.00`} />
              {addOns > 0 && <Row label="Add-ons" value={`₹${addOns}.00`} />}
              <Row label="Delivery" value={`₹${deliveryFee}.00`} />
            </div>
            <div className="pt-3 border-t border-[color:var(--color-ink)]/10 flex items-center justify-between">
              <span className="font-serif text-[20px]">Total</span>
              <span className="font-serif text-[32px] text-[color:var(--color-forest)] leading-none">₹{total}</span>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-[color:var(--color-terracotta)]/10 border border-[color:var(--color-terracotta)]/25 px-3 py-2 text-[12.5px] text-[color:var(--color-terracotta-dark)]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={placeOrder}
              disabled={placing || !hasAddress}
              className={cn(
                'w-full rounded-2xl px-5 py-4 font-semibold text-[14.5px] transition-all flex items-center justify-center gap-2',
                hasAddress && !placing
                  ? 'bg-gradient-to-r from-[color:var(--color-forest)] to-[color:var(--color-moss)] text-[color:var(--color-cream)] hover:shadow-[0_12px_24px_-8px_rgba(15,81,50,0.4)]'
                  : 'bg-[color:var(--color-ink)]/8 text-[color:var(--color-ink-soft)]/60 cursor-not-allowed',
              )}
            >
              Place Order · ₹{total}
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8m0 0L6.5 2.5M10 6l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/60">
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="5" width="10" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
                <path d="M4.5 5V3.5a2.5 2.5 0 015 0V5" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              256-bit encrypted · demo gateway
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] p-6 shadow-[0_6px_20px_-12px_rgba(15,15,14,0.1)]">
      <div className="text-[15px] font-semibold text-[color:var(--color-ink)] mb-4">{label}</div>
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

function DeliveryTile({ label, sub, icon, active, disabled }: { label: string; sub: string; icon: React.ReactNode; active?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'rounded-xl border px-4 py-4 flex flex-col items-center gap-2 transition-colors',
        active
          ? 'border-[color:var(--color-forest)] bg-[color:var(--color-forest)]/5 text-[color:var(--color-forest)]'
          : disabled
            ? 'border-[color:var(--color-ink)]/8 bg-[color:var(--color-cream)]/40 text-[color:var(--color-ink-soft)]/50 cursor-not-allowed'
            : 'border-[color:var(--color-ink)]/12 hover:border-[color:var(--color-forest)]/40 text-[color:var(--color-ink-soft)]',
      )}
    >
      {icon}
      <div className="text-[13px] font-medium">{label}</div>
      <div className="text-[10.5px] uppercase tracking-[0.1em] opacity-70">{sub}</div>
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
      <span className="text-[13px]">
        <span className="mr-1">{icon}</span>
        {label}
        <span className="ml-1 text-[color:var(--color-ink-soft)]">({sub})</span>
      </span>
    </label>
  );
}

function PayTile({ label, sub, icon, active, onClick }: { label: string; sub: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border-2 px-4 py-4 flex flex-col items-center gap-2 transition-all',
        active
          ? 'border-[color:var(--color-forest)] bg-[color:var(--color-forest)]/5'
          : 'border-[color:var(--color-ink)]/10 hover:border-[color:var(--color-forest)]/30',
      )}
    >
      <span className={cn('text-[color:var(--color-forest)]', !active && 'opacity-70')}>{icon}</span>
      <div className="text-[13.5px] font-medium text-[color:var(--color-ink)]">{label}</div>
      <div className="text-[10.5px] text-[color:var(--color-ink-soft)]/75">{sub}</div>
    </button>
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

const CardIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="3" y="7" width="22" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    <line x1="3" y1="12" x2="25" y2="12" stroke="currentColor" strokeWidth="1.8" />
    <line x1="7" y1="17" x2="12" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const UpiIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="8" y="3" width="12" height="22" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="14" cy="21" r="1" fill="currentColor" />
  </svg>
);
const BankIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M14 4l10 5H4l10-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M6 11v9M11 11v9M17 11v9M22 11v9M3 23h22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const CashIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="3" y="8" width="22" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="14" cy="14" r="3" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="6" cy="14" r="0.8" fill="currentColor" />
    <circle cx="22" cy="14" r="0.8" fill="currentColor" />
  </svg>
);
