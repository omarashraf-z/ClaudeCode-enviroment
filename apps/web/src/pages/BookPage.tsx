import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, api, money } from '../api';
import { Grain, TopBar } from '../components/Chrome';
import { useParty } from '../hooks/useParty';
import { usePartyState } from '../hooks/useCountdown';
import { useAccent } from '../hooks/useTheme';
import type { Tier } from '../types';

export default function BookPage() {
  const navigate = useNavigate();
  const { data, error, loading } = useParty();
  const party = data?.party ?? null;
  const state = usePartyState(party);
  useAccent(party?.accent, party?.accentInk);

  const sellable = useMemo(
    () => (party?.tiers ?? []).filter((tier) => !tier.doorOnly && !tier.soldOut),
    [party]
  );

  const [tierId, setTierId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  /* Default to the cheapest tier still on sale. */
  useEffect(() => {
    if (tierId === null && sellable.length) {
      const cheapest = [...sellable].sort((a, b) => a.priceCents - b.priceCents)[0];
      if (cheapest) setTierId(cheapest.id);
    }
  }, [sellable, tierId]);

  if (loading) return <Shell><p className="book__wait">One second…</p></Shell>;
  if (error) return <Shell><p className="book__bad">{error}</p></Shell>;

  if (!party || state === 'over') {
    return (
      <Shell>
        <h1 className="book__h">NOTHING TO BOOK</h1>
        <p className="book__lede">There is no party on sale right now.</p>
        <Link className="btn btn--big" to="/">BACK TO THE FRONT</Link>
      </Shell>
    );
  }

  if (!sellable.length) {
    return (
      <Shell>
        <h1 className="book__h">SOLD OUT</h1>
        <p className="book__lede">
          Every ticket for {party.name} is gone. There is no waiting list and no guest list.
        </p>
        <Link className="btn btn--big" to="/">BACK TO THE FRONT</Link>
      </Shell>
    );
  }

  const tier = sellable.find((candidate) => candidate.id === tierId) ?? sellable[0]!;
  const max = Math.min(data?.maxPerBooking ?? 4, tier.remaining);
  const total = tier.priceCents * quantity;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setProblem(null);
    setBusy(true);
    try {
      const created = await api.book({
        tierId: tier.id,
        name: name.trim(),
        email: email.trim(),
        quantity: Math.min(quantity, max)
      });
      /* Stripe hands back a URL; the mock provider hands back a ticket. */
      if (created.checkoutUrl) {
        window.location.assign(created.checkoutUrl);
        return;
      }
      navigate(`/ticket/${created.ref}`, { replace: true });
    } catch (thrown) {
      const message =
        thrown instanceof ApiError ? thrown.message : 'That didn’t go through. Try again.';
      setProblem(message);
      setBusy(false);
    }
  }

  return (
    <Shell>
      <p className="book__eyebrow">VOL. {String(party.volume).padStart(2, '0')} · {party.dateLine}</p>
      <h1 className="book__h">{party.name}</h1>
      <p className="book__lede">
        {party.venue.secret ? 'Secret location' : `${party.venue.name}, ${party.venue.area}`} · {party.timeLine}
      </p>

      <form className="book" onSubmit={submit}>
        <fieldset className="book__group" disabled={busy}>
          <legend className="book__legend">TICKET</legend>
          {sellable.map((option) => (
            <TierChoice
              key={option.id}
              tier={option}
              checked={option.id === tier.id}
              onSelect={() => {
                setTierId(option.id);
                setQuantity((current) => Math.min(current, option.remaining));
              }}
            />
          ))}
        </fieldset>

        <fieldset className="book__group" disabled={busy}>
          <legend className="book__legend">HOW MANY</legend>
          <div className="stepper">
            <button type="button" onClick={() => setQuantity((n) => Math.max(1, n - 1))} aria-label="One fewer">−</button>
            <span className="stepper__value" aria-live="polite">{Math.min(quantity, max)}</span>
            <button type="button" onClick={() => setQuantity((n) => Math.min(max, n + 1))} aria-label="One more">+</button>
          </div>
          <p className="book__hint">Maximum {max} per booking. {tier.remaining} left in {tier.name}.</p>
        </fieldset>

        <fieldset className="book__group" disabled={busy}>
          <legend className="book__legend">WHO</legend>
          <label className="field">
            <span>Name on the door</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" />
          </label>
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" maxLength={160} autoComplete="email" inputMode="email" />
          </label>
        </fieldset>

        <div className="book__total">
          <span>TOTAL</span>
          <strong>{money(total, tier.currency)}</strong>
        </div>

        {problem ? <p className="book__bad" role="alert">{problem}</p> : null}

        <button className="btn btn--big btn--full" type="submit" disabled={busy}>
          {busy ? 'HOLDING YOUR SPOT…' : total === 0 ? 'CLAIM IT' : 'BOOK IT'}
        </button>
        <p className="book__hint">
          You’ll get a reference and a QR code. That is your ticket — nothing gets posted to you.
        </p>
      </form>
    </Shell>
  );
}

function TierChoice({ tier, checked, onSelect }: { tier: Tier; checked: boolean; onSelect: () => void }) {
  return (
    <label className={`choice${checked ? ' is-on' : ''}`}>
      <input type="radio" name="tier" checked={checked} onChange={onSelect} />
      <span className="choice__name">{tier.name}</span>
      <span className="choice__price">{money(tier.priceCents, tier.currency)}</span>
      <span className="choice__left">{tier.remaining} left</span>
    </label>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="page">
      <Grain />
      <TopBar cta={{ label: 'BACK', to: '/' }} />
      <main className="page__body">{children}</main>
    </div>
  );
}
