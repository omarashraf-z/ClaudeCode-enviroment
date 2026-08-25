import { useEffect, useState } from 'react';
import { Grain, TopBar } from '../components/Chrome';
import { AuthGate } from '../components/AuthGate';
import { useAuth } from '../lib/auth';
import { money } from '../content';
import type { TicketType } from '../content';
import {
  addArchiveEntry,
  deleteArchiveEntry,
  fetchPartyForAdmin,
  saveParty,
  usePartyData,
  type PartyUpdate
} from '../lib/partyData';
import {
  fetchAllReservations,
  setReservationStatus,
  type AdminReservation
} from '../lib/adminReservations';

export default function AdminPage() {
  return (
    <div className="page admin">
      <Grain />
      <TopBar cta={{ label: 'BACK', to: '/' }} />
      <main className="page__body">
        <AuthGate title="ADMIN" lede="Log in with an admin account.">
          <AdminGuard />
        </AuthGate>
      </main>
    </div>
  );
}

function AdminGuard() {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile?.isAdmin) {
    return (
      <>
        <h1 className="book__h">NOT AUTHORIZED</h1>
        <p className="book__lede">This account isn't an admin.</p>
      </>
    );
  }
  return (
    <>
      <h1 className="book__h">ADMIN</h1>
      <ReservationQueue />
      <PartyEditor />
      <ArchiveEditor />
    </>
  );
}

function ReservationQueue() {
  const [reservations, setReservations] = useState<AdminReservation[] | null>(null);
  const [tab, setTab] = useState<'pending' | 'confirmed' | 'rejected'>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => void fetchAllReservations().then(setReservations);
  useEffect(load, []);

  async function decide(id: string, status: 'confirmed' | 'rejected') {
    setBusyId(id);
    try {
      await setReservationStatus(id, status);
      load();
    } finally {
      setBusyId(null);
    }
  }

  const shown = (reservations ?? []).filter((r) => r.status === tab);

  return (
    <section className="sec" id="reservations">
      <h2 className="sec__h">RESERVATIONS</h2>
      <div className="auth__tabs">
        {(['pending', 'confirmed', 'rejected'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`auth__tab${tab === t ? ' is-on' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.toUpperCase()} ({(reservations ?? []).filter((r) => r.status === t).length})
          </button>
        ))}
      </div>

      {!reservations ? <p className="book__lede">Loading…</p> : null}
      {reservations && !shown.length ? <p className="book__lede">Nothing here.</p> : null}

      <ul className="admin__list">
        {shown.map((r) => (
          <li className="admin__row" key={r.id}>
            <div className="admin__row-main">
              <p className="admin__row-name">{r.name} <span className="admin__row-user">@{r.username}</span></p>
              <p className="admin__row-detail">{r.quantity} × {r.ticket} — {money(r.amount)} — {r.partyName}</p>
              <p className="admin__row-detail">{r.phone} · {r.email}</p>
              {r.note ? <p className="admin__row-detail">Note: {r.note}</p> : null}
              {r.receiptUrl ? (
                <a className="admin__row-detail" href={r.receiptUrl} target="_blank" rel="noopener">
                  VIEW RECEIPT
                </a>
              ) : null}
            </div>
            {r.status === 'pending' ? (
              <div className="admin__row-actions">
                <button
                  className="btn btn--big"
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => decide(r.id, 'confirmed')}
                >
                  ACCEPT
                </button>
                <button
                  className="btn btn--ghost"
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => decide(r.id, 'rejected')}
                >
                  REJECT
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function PartyEditor() {
  const { refresh } = usePartyData();
  const [form, setForm] = useState<PartyUpdate | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void fetchPartyForAdmin().then(setForm);
  }, []);

  if (!form) return <section className="sec"><h2 className="sec__h">PARTY DETAILS</h2><p className="book__lede">Loading…</p></section>;

  function set<K extends keyof PartyUpdate>(key: K, value: PartyUpdate[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function setTicket(index: number, patch: Partial<TicketType>) {
    set('tickets', form!.tickets.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setSaved(false);
    try {
      await saveParty(form);
      setSaved(true);
      refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="sec" id="party">
      <h2 className="sec__h">PARTY DETAILS</h2>
      <form className="book" onSubmit={save}>
        <fieldset className="book__group">
          <legend className="book__legend">STATUS</legend>
          <label className="choice">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
            <span className="choice__name">There is a party right now</span>
          </label>
          <p className="book__hint">Uncheck between parties — the site shows "nothing planned" instead.</p>
        </fieldset>

        <fieldset className="book__group">
          <legend className="book__legend">THE BASICS</legend>
          <label className="field"><span>Name</span><input value={form.name} onChange={(e) => set('name', e.target.value)} required /></label>
          <label className="field"><span>Subtitle</span><input value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} /></label>
          <label className="field"><span>Accent colour</span><input type="color" value={form.accent} onChange={(e) => set('accent', e.target.value)} /></label>
          <label className="field"><span>Accent ink (text on accent)</span><input type="color" value={form.accentInk} onChange={(e) => set('accentInk', e.target.value)} /></label>
        </fieldset>

        <fieldset className="book__group">
          <legend className="book__legend">DATE &amp; TIME</legend>
          <label className="field"><span>Starts at (with timezone)</span><input type="datetime-local" value={toLocalInput(form.startsAt)} onChange={(e) => set('startsAt', fromLocalInput(e.target.value))} required /></label>
          <label className="field"><span>Ends at</span><input type="datetime-local" value={toLocalInput(form.endsAt)} onChange={(e) => set('endsAt', fromLocalInput(e.target.value))} required /></label>
          <label className="field"><span>Date line (shown on the poster)</span><input value={form.dateLine} onChange={(e) => set('dateLine', e.target.value)} placeholder="THU 3 SEP 2026" required /></label>
          <label className="field"><span>Time line</span><input value={form.timeLine} onChange={(e) => set('timeLine', e.target.value)} placeholder="21:00 – 02:00" required /></label>
        </fieldset>

        <fieldset className="book__group">
          <legend className="book__legend">VENUE</legend>
          <label className="field"><span>Name</span><input value={form.venueName} onChange={(e) => set('venueName', e.target.value)} required /></label>
          <label className="field"><span>Area / city</span><input value={form.venueArea} onChange={(e) => set('venueArea', e.target.value)} required /></label>
          <label className="field"><span>Address</span><input value={form.venueAddress} onChange={(e) => set('venueAddress', e.target.value)} /></label>
          <label className="field"><span>Map link</span><input value={form.venueMapUrl} onChange={(e) => set('venueMapUrl', e.target.value)} /></label>
          <label className="field"><span>Note</span><input value={form.venueNote} onChange={(e) => set('venueNote', e.target.value)} /></label>
          <label className="choice">
            <input type="checkbox" checked={form.venueSecret} onChange={(e) => set('venueSecret', e.target.checked)} />
            <span className="choice__name">Secret — hide the address until confirmed</span>
          </label>
        </fieldset>

        <fieldset className="book__group">
          <legend className="book__legend">CAPACITY</legend>
          <label className="field"><span>Total capacity</span><input type="number" min={0} value={form.capacity} onChange={(e) => set('capacity', Number(e.target.value))} required /></label>
        </fieldset>

        <fieldset className="book__group">
          <legend className="book__legend">TICKETS</legend>
          {form.tickets.map((ticket, index) => (
            <div className="admin__ticket-row" key={index}>
              <input placeholder="Name" value={ticket.name} onChange={(e) => setTicket(index, { name: e.target.value })} />
              <input placeholder="Price" type="number" min={0} value={ticket.price} onChange={(e) => setTicket(index, { price: Number(e.target.value) })} />
              <input placeholder="Quantity" type="number" min={0} value={ticket.quantity} onChange={(e) => setTicket(index, { quantity: Number(e.target.value) })} />
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => set('tickets', form.tickets.filter((_, i) => i !== index))}>REMOVE</button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => set('tickets', [...form.tickets, { name: '', price: 0, quantity: 0 }])}
          >
            + ADD TICKET TYPE
          </button>
        </fieldset>

        <fieldset className="book__group">
          <legend className="book__legend">HOUSE RULES</legend>
          <label className="field">
            <span>One rule per line</span>
            <textarea
              rows={4}
              value={form.rules.join('\n')}
              onChange={(e) => set('rules', e.target.value.split('\n').map((r) => r.trim()).filter(Boolean))}
            />
          </label>
        </fieldset>

        <button className="btn btn--big btn--full" type="submit" disabled={saving}>
          {saving ? 'SAVING…' : 'SAVE PARTY'}
        </button>
        {saved ? <p className="book__hint">Saved.</p> : null}
      </form>
    </section>
  );
}

function ArchiveEditor() {
  const { archive, refresh } = usePartyData();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addArchiveEntry(name.trim());
      setName('');
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await deleteArchiveEntry(id);
    refresh();
  }

  return (
    <section className="sec" id="archive-admin">
      <h2 className="sec__h">ARCHIVE</h2>
      <ul className="archive">
        {archive.map((entry) => (
          <li className="arch" key={entry.id}>
            <span className="arch__name">{entry.name}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(entry.id)}>REMOVE</button>
          </li>
        ))}
      </ul>
      <form className="book" onSubmit={add}>
        <label className="field">
          <span>Add a past party</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="PARTY NAME" />
        </label>
        <button className="btn btn--ghost" type="submit" disabled={busy}>ADD TO ARCHIVE</button>
      </form>
    </section>
  );
}

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}
