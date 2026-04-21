'use client';

import { useMemo, useState } from 'react';
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
type Step = 'cart' | 'address' | 'payment';

const TAX_RATE = 0.05;
const DELIVERY_FEE = 25;
const GIFT_WRAP_FEE = 50;
const INSURANCE_FEE = 100;

const BANKS = ['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'Yes'];

const STEPS: Step[] = ['cart', 'address', 'payment'];
const STEP_LABEL: Record<Step, string> = { cart: 'Cart', address: 'Address', payment: 'Payment' };

export function CheckoutClient({ session }: Props) {
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

  if (items.length === 0 && !placing) {
    return (
      <section className="pt-28 pb-24 min-h-[60vh]">
        <div className="mx-auto max-w-[720px] px-6 text-center">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-saffron)]">Checkout</div>
          <h1 className="mt-4 font-serif text-[40px] sm:text-[52px] leading-[0.98] tracking-[-0.02em]">
            Your cart is <span className="italic text-[color:var(--color-forest)]">empty.</span>
          </h1>
          <a href="/menu" className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full text-[14px] font-medium bg-[color:var(--color-forest)] text-[color:var(--color-cream)] hover:bg-[color:var(--color-forest-dark)]">
            Browse the menu
          </a>
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
                <Row label="Subtotal" value={`₹${subtotal}`} />
                <Row label="Tax (5%)" value={`₹${tax}`} />
                {addOns > 0 && <Row label="Add-ons" value={`₹${addOns}`} />}
                <Row label="Delivery" value={`₹${deliveryFee}`} />
              </div>
              <div className="mt-3 pt-3 border-t border-[color:var(--color-ink)]/10 flex items-center justify-between">
                <span className="font-serif text-[18px]">Total</span>
                <span className="font-serif text-[30px] leading-none text-[color:var(--color-forest)]">₹{total}</span>
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
              <div className="text-right shrink-0 font-serif text-[16px]">₹{it.priceInr * it.qty}</div>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-between items-stretch sm:items-center">
        <a href="/menu" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13.5px] text-[color:var(--color-ink)] hover:bg-[color:var(--color-ink)]/5 border border-[color:var(--color-ink)]/10">
          ← Continue shopping
        </a>
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

function AddressStep({ session, notes, setNotes, onBack, onNext, hasAddress }: {
  session: Props['session'];
  notes: string;
  setNotes: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  hasAddress: boolean;
}) {
  return (
    <>
      <Card label="Delivery address">
        {hasAddress ? (
          <div className="rounded-xl border-2 border-[color:var(--color-forest)] bg-[color:var(--color-forest)]/5 p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="font-medium text-[color:var(--color-ink)]">{session.name ?? 'Your address'}</div>
              <div className="mt-1 text-[13.5px] text-[color:var(--color-ink-soft)]">Flat {session.flat}, {session.building}</div>
              <div className="text-[13.5px] text-[color:var(--color-ink-soft)]">{session.society}, Magarpatta City</div>
              <div className="text-[13.5px] text-[color:var(--color-ink-soft)]">Pune, Maharashtra · 411028</div>
              <div className="mt-2 text-[12px] text-[color:var(--color-ink-soft)]/75">+91 {session.phone}</div>
              <a href="/signup" className="mt-3 inline-block text-[12.5px] text-[color:var(--color-forest)] underline underline-offset-4">
                Change address →
              </a>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        ) : (
          <div className="rounded-xl border border-[color:var(--color-terracotta)]/30 bg-[color:var(--color-terracotta)]/5 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <div className="font-medium text-[color:var(--color-terracotta-dark)]">No delivery address yet</div>
              <div className="text-[13px] text-[color:var(--color-ink-soft)]">Set your society, building and flat.</div>
            </div>
            <a href="/signup" className="shrink-0 px-4 py-2 rounded-full text-[13px] font-medium bg-[color:var(--color-forest)] text-[color:var(--color-cream)]">
              Set address
            </a>
          </div>
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
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
  total: number;
}) {
  const { payMethod, setPayMethod } = props;
  return (
    <>
      <Card label="Payment method">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <PayTile active={payMethod === 'CARD'} onClick={() => setPayMethod('CARD')} label="Card" icon={<CardIcon />} />
          <PayTile active={payMethod === 'UPI'} onClick={() => setPayMethod('UPI')} label="UPI" icon={<UpiIcon />} />
          <PayTile active={payMethod === 'NET_BANKING'} onClick={() => setPayMethod('NET_BANKING')} label="Net Banking" icon={<BankIcon />} />
          <PayTile active={payMethod === 'COD'} onClick={() => setPayMethod('COD')} label="Cash" icon={<CashIcon />} />
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
