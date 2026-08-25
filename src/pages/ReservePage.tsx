import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE, money } from '../content';
import { Grain, TopBar } from '../components/Chrome';
import { AuthGate } from '../components/AuthGate';
import { useAccent } from '../hooks/useTheme';
import { usePartyState } from '../hooks/useCountdown';
import { usePartyData } from '../lib/partyData';
import { useAuth } from '../lib/auth';
import { ReservationError, fetchTaken, submitReservation } from '../reserve';

export default function ReservePage() {
  const { party, loading } = usePartyData();
  const state = usePartyState(party);
  useAccent(party?.accent, party?.accentInk);

  if (loading) return <Shell><p className="book__lede">Loading…</p></Shell>;

  return (
    <Shell>
      <AuthGate title="RESERVE A SPOT" lede="Create an account (or log in) to book a ticket.">
        <Booking party={party} state={state} />
      </AuthGate>
    </Shell>
  );
}

function Booking({ party, state }: { party: ReturnType<typeof usePartyData>['party']; state: ReturnType<typeof usePartyState> }) {
  const { user } = useAuth();
  const [taken, setTaken] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    if (!party) return;
    void fetchTaken(party.name).then(setTaken);
  }, [party]);

  const sellable = useMemo(
    () =>
      (party?.tickets ?? [])
        .filter((ticket) => !ticket.doorOnly)
        .map((ticket) => ({
          ...ticket,
          left: Math.max(0, ticket.quantity - (taken?.[ticket.name] ?? 0))
        }))
        .filter((ticket) => ticket.left > 0),
    [party, taken]
  );

  const [ticketName, setTicketName] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<
    { ref: string; ticket: string; quantity: number; name: string; email: string } | null
  >(null);
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sellable.length) return;
    const stillThere = sellable.some((option) => option.name === ticketName);
    if (!stillThere) setTicketName(sellable[0]!.name);
  }, [sellable, ticketName]);

  useEffect(() => {
    if (!receipt) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(receipt);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [receipt]);

  if (!party || state === 'over') {
    return (
      <>
        <h1 className="book__h">NOTHING TO BOOK</h1>
        <p className="book__lede">There is no party taking reservations right now.</p>
        <Link className="btn btn--big" to="/">BACK TO THE FRONT</Link>
      </>
    );
  }

  if (!sellable.length) {
    return (
      <>
        <h1 className="book__h">SOLD OUT</h1>
        <p className="book__lede">
          Every ticket for {party.name} is spoken for. There is no waiting list.
        </p>
        <Link className="btn btn--big" to="/">BACK TO THE FRONT</Link>
      </>
    );
  }

  if (done) {
    return (
      <div className="sent">
        <p className="sent__tick" aria-hidden="true">✓</p>
        <h1 className="book__h">GOT IT</h1>
        <p className="sent__lede">
          We'll confirm your reservation soon. Once it's checked, it'll show up on My Tickets.
        </p>
        <p className="sent__ref">{done.ref}</p>
        <dl className="sent__facts">
          <div><dt>NAME</dt><dd>{done.name}</dd></div>
          <div><dt>TICKETS</dt><dd>{done.quantity} × {done.ticket}</dd></div>
          <div><dt>EMAIL</dt><dd>{done.email}</dd></div>
        </dl>
        <Link className="btn btn--ghost" to="/my-tickets">MY TICKETS</Link>
      </div>
    );
  }

  const ticket = sellable.find((candidate) => candidate.name === ticketName) ?? sellable[0]!;
  const max = Math.min(SITE.maxPerReservation, ticket.left);
  const count = Math.min(quantity, max);
  const total = ticket.price * count;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setProblem(null);

    if (!receipt) {
      setProblem('Attach the screenshot of your transfer.');
      fileInput.current?.focus();
      return;
    }
    if (!user) return;

    setBusy(true);
    try {
      const result = await submitReservation(
        {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          quantity: count,
          ticket: ticket.name,
          amount: total,
          note: note.trim(),
          party: party!.name,
          receipt
        },
        user.id
      );
      setDone({
        ref: result.ref,
        ticket: ticket.name,
        quantity: count,
        name: name.trim(),
        email: email.trim()
      });
      window.scrollTo(0, 0);
    } catch (thrown) {
      setProblem(
        thrown instanceof ReservationError ? thrown.message : "That didn't go through. Try again."
      );
      setBusy(false);
    }
  }

  return (
    <>
      <p className="book__eyebrow">{party.dateLine}</p>
      <h1 className="book__h">{party.name}</h1>
      <p className="book__lede">
        {party.venue.secret ? 'Secret location' : [party.venue.name, party.venue.area].filter(Boolean).join(', ')} · {party.timeLine}
      </p>

      <form className="book" onSubmit={submit}>
        <fieldset className="book__group" disabled={busy}>
          <legend className="book__legend">TICKET</legend>
          {sellable.length === 1 ? (
            <p className="choice choice--only">
              <span className="choice__name">{ticket.name}</span>
              <span className="choice__price">{money(ticket.price)}</span>
              {taken ? <span className="choice__left">{ticket.left} left</span> : null}
            </p>
          ) : sellable.map((option) => (
            <label className={`choice${option.name === ticket.name ? ' is-on' : ''}`} key={option.name}>
              <input
                type="radio"
                name="ticket"
                checked={option.name === ticket.name}
                onChange={() => {
                  setTicketName(option.name);
                  setQuantity((current) => Math.min(current, option.left));
                }}
              />
              <span className="choice__name">{option.name}</span>
              <span className="choice__price">{money(option.price)}</span>
              {taken ? <span className="choice__left">{option.left} left</span> : null}
            </label>
          ))}
        </fieldset>

        <fieldset className="book__group" disabled={busy}>
          <legend className="book__legend">HOW MANY</legend>
          <div className="stepper">
            <button type="button" onClick={() => setQuantity((n) => Math.max(1, n - 1))} aria-label="One fewer">−</button>
            <span className="stepper__value" aria-live="polite">{count}</span>
            <button type="button" onClick={() => setQuantity((n) => Math.min(max, n + 1))} aria-label="One more">+</button>
          </div>
          <p className="book__hint">Up to {max} per person.</p>
        </fieldset>

        <section className="pay">
          <p className="pay__label">SEND EXACTLY</p>
          <p className="pay__total">{money(total)}</p>
          <p className="pay__label">TO THIS {SITE.payment.label.toUpperCase()} ACCOUNT</p>
          <p className="pay__address">{SITE.payment.address}</p>
          <p className="pay__name">{SITE.payment.accountName}</p>
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(SITE.payment.address).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1800);
              });
            }}
          >
            {copied ? 'COPIED' : 'COPY ADDRESS'}
          </button>
          <ol className="pay__steps">
            {SITE.payment.steps.map((step, index) => (
              <li key={step}><span>{index + 1}</span>{step}</li>
            ))}
          </ol>
        </section>

        <fieldset className="book__group" disabled={busy}>
          <legend className="book__legend">YOUR TRANSFER</legend>
          <label className={`drop${receipt ? ' is-filled' : ''}`}>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              required
              onChange={(event) => setReceipt(event.target.files?.[0] ?? null)}
            />
            {preview ? (
              <>
                <img className="drop__preview" src={preview} alt="Your payment screenshot" />
                <span className="drop__swap">Tap to choose a different one</span>
              </>
            ) : (
              <>
                <span className="drop__icon" aria-hidden="true">＋</span>
                <span className="drop__text">Attach the screenshot of your {SITE.payment.label} transfer</span>
              </>
            )}
          </label>
        </fieldset>

        <fieldset className="book__group" disabled={busy}>
          <legend className="book__legend">WHO YOU ARE</legend>
          <label className="field">
            <span>Full name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" />
          </label>
          <label className="field">
            <span>Phone number</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required type="tel" maxLength={30} autoComplete="tel" inputMode="tel" />
          </label>
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" maxLength={160} autoComplete="email" inputMode="email" />
          </label>
          <label className="field">
            <span>Anything we should know (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          </label>
        </fieldset>

        {problem ? <p className="book__bad" role="alert">{problem}</p> : null}

        <button className="btn btn--big btn--full" type="submit" disabled={busy}>
          {busy ? 'SENDING…' : 'SEND MY RESERVATION'}
        </button>
        <p className="book__hint">{SITE.payment.note}</p>
      </form>
    </>
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
