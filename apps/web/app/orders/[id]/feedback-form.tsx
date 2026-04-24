'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Feedback {
  foodRating: number | null;
  foodComment: string | null;
  deliveryRating: number | null;
  deliveryComment: string | null;
}

export function FeedbackForm({ orderId, vendorName, riderName, hasRider }: { orderId: string; vendorName: string | null; riderName: string | null; hasRider: boolean }) {
  const router = useRouter();
  const [existing, setExisting] = useState<Feedback | null>(null);
  const [foodRating, setFoodRating] = useState<number>(0);
  const [foodComment, setFoodComment] = useState('');
  const [deliveryRating, setDeliveryRating] = useState<number>(0);
  const [deliveryComment, setDeliveryComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/orders/${orderId}/feedback`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.feedback) {
          setExisting(j.feedback);
          setFoodRating(j.feedback.foodRating ?? 0);
          setFoodComment(j.feedback.foodComment ?? '');
          setDeliveryRating(j.feedback.deliveryRating ?? 0);
          setDeliveryComment(j.feedback.deliveryComment ?? '');
        }
      });
  }, [orderId]);

  async function submit() {
    if (!foodRating && !deliveryRating) {
      setMsg('Please rate at least one of food or delivery.');
      return;
    }
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foodRating: foodRating || undefined,
          foodComment,
          deliveryRating: deliveryRating || undefined,
          deliveryComment,
        }),
      });
      const j = await res.json();
      if (!j.ok) { setMsg(j.error ?? 'Could not save'); return; }
      setExisting(j.feedback);
      setMsg('Thanks! Feedback saved — heading back to the menu.');
      // Brief pause so the success toast is visible, then take the customer
      // back to the menu to order again.
      setTimeout(() => router.push('/menu'), 900);
    } finally { setSaving(false); }
  }

  const alreadySubmitted = Boolean(existing);

  return (
    <section className="mt-8 rounded-2xl border border-[color:var(--color-ink)]/10 bg-[color:var(--color-paper)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[color:var(--color-ink)]/8 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-saffron)]">How was it?</div>
          <h3 className="mt-1 font-serif text-[20px] leading-tight">Rate your order</h3>
        </div>
        {alreadySubmitted && (
          <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-forest)]">Already rated · edit if you like</span>
        )}
      </div>
      <div className="px-6 py-5 space-y-5">
        <Block
          label={`Food from ${vendorName ?? 'the vendor'}`}
          rating={foodRating}
          setRating={setFoodRating}
          comment={foodComment}
          setComment={setFoodComment}
          placeholder="How was the food — taste, temperature, portion?"
        />
        {hasRider && (
          <Block
            label={`Delivery by ${riderName ?? 'your rider'}`}
            rating={deliveryRating}
            setRating={setDeliveryRating}
            comment={deliveryComment}
            setComment={setDeliveryComment}
            placeholder="Time taken, behaviour, any issues?"
          />
        )}
        {!hasRider && (
          <Block
            label={`Delivery by ${vendorName ?? 'the vendor'}`}
            rating={deliveryRating}
            setRating={setDeliveryRating}
            comment={deliveryComment}
            setComment={setDeliveryComment}
            placeholder="How was the vendor-direct delivery?"
          />
        )}
        <div className="flex items-center justify-between gap-3">
          {msg && <span className="text-[12.5px] text-[color:var(--color-forest)]">{msg}</span>}
          <button
            onClick={submit}
            disabled={saving}
            className="ml-auto rounded-full bg-[color:var(--color-forest)] text-[color:var(--color-cream)] px-5 py-2.5 text-[13.5px] font-medium hover:bg-[color:var(--color-forest-dark)] disabled:opacity-50"
          >
            {saving ? 'Saving…' : alreadySubmitted ? 'Update rating' : 'Submit rating'}
          </button>
        </div>
      </div>
    </section>
  );
}

function Block({ label, rating, setRating, comment, setComment, placeholder }: {
  label: string;
  rating: number;
  setRating: (n: number) => void;
  comment: string;
  setComment: (s: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <div className="text-[12.5px] font-medium text-[color:var(--color-ink)]">{label}</div>
      <div className="mt-2 flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n === rating ? 0 : n)}
            className={`text-[24px] leading-none transition-colors ${n <= rating ? 'text-[color:var(--color-saffron)]' : 'text-[color:var(--color-ink)]/20 hover:text-[color:var(--color-saffron)]/60'}`}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-ink-soft)]/70">
          {rating ? `${rating} / 5` : 'tap to rate'}
        </span>
      </div>
      <textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-[color:var(--color-ink)]/12 bg-[color:var(--color-paper)] px-3 py-2 text-[13px] outline-none focus:border-[color:var(--color-forest)]"
        maxLength={500}
      />
    </div>
  );
}
