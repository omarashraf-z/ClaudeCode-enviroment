import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api, money } from '../api';
import { Grain } from '../components/Chrome';
import type { AdminBooking, AdminPartySummary, PartyStats } from '../types';

export default function AdminPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    api.admin
      .session()
      .then(() => setSignedIn(true))
      .catch(() => setSignedIn(false));
  }, []);

  if (signedIn === null) return <AdminShell><p className="book__wait">…</p></AdminShell>;
  if (!signedIn) return <LoginForm onIn={() => setSignedIn(true)} />;
  return <Dashboard onOut={() => setSignedIn(false)} />;
}

function LoginForm({ onIn }: { onIn: () => void }) {
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <AdminShell>
      <h1 className="admin__h">THE DOOR</h1>
      <p className="book__lede">Staff only. Everyone else, the party is that way.</p>
      <form
        className="admin__login"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setProblem(null);
          try {
            await api.admin.login(password);
            onIn();
          } catch (thrown) {
            setProblem(thrown instanceof ApiError ? thrown.message : 'No.');
            setBusy(false);
          }
        }}
      >
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {problem ? <p className="book__bad" role="alert">{problem}</p> : null}
        <button className="btn btn--big" type="submit" disabled={busy}>SIGN IN</button>
      </form>
      <Link className="admin__back" to="/">← back to the party</Link>
    </AdminShell>
  );
}

function Dashboard({ onOut }: { onOut: () => void }) {
  const [parties, setParties] = useState<AdminPartySummary[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [stats, setStats] = useState<PartyStats | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadParties = useCallback(async () => {
    const { parties: list } = await api.admin.parties();
    setParties(list);
    setSelected((current) => current ?? list.find((p) => p.status === 'live')?.id ?? list[0]?.id ?? null);
  }, []);

  const loadBookings = useCallback(async (partyId: number) => {
    const data = await api.admin.bookings(partyId);
    setBookings(data.bookings);
    setStats(data.stats);
  }, []);

  useEffect(() => {
    void loadParties();
  }, [loadParties]);

  useEffect(() => {
    if (selected !== null) void loadBookings(selected);
  }, [selected, loadBookings]);

  const act = async (work: () => Promise<unknown>, done: string) => {
    try {
      await work();
      setNotice(done);
      await loadParties();
      if (selected !== null) await loadBookings(selected);
    } catch (thrown) {
      setNotice(thrown instanceof ApiError ? thrown.message : 'That failed.');
    }
  };

  const party = parties.find((candidate) => candidate.id === selected) ?? null;

  return (
    <AdminShell>
      <header className="admin__top">
        <h1 className="admin__h">THE DOOR</h1>
        <button
          className="btn btn--ghost btn--sm"
          type="button"
          onClick={async () => {
            await api.admin.logout();
            onOut();
          }}
        >
          SIGN OUT
        </button>
      </header>

      {notice ? <p className="admin__notice" role="status">{notice}</p> : null}

      <CheckInBox onResult={setNotice} onChanged={() => selected !== null && loadBookings(selected)} />

      <section className="admin__section">
        <h2 className="admin__h2">PARTIES</h2>
        <ul className="admin__parties">
          {parties.map((row) => (
            <li key={row.id} className={row.id === selected ? 'is-on' : undefined}>
              <button type="button" onClick={() => setSelected(row.id)}>
                <span className={`tag tag--${row.status}`}>{row.status}</span>
                <span className="admin__pname">V{String(row.volume).padStart(2, '0')} {row.name}</span>
                <span className="admin__pdate">{row.dateLine}</span>
              </button>
              {row.status === 'draft' ? (
                <button className="btn btn--ghost btn--sm" type="button" onClick={() => act(() => api.admin.publish(row.id), `${row.name} is live.`)}>
                  GO LIVE
                </button>
              ) : null}
              {row.status === 'live' ? (
                <button className="btn btn--ghost btn--sm" type="button" onClick={() => act(() => api.admin.archive(row.id), `${row.name} is over.`)}>
                  END IT
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="admin__hint">
          One party is live at a time — the database enforces it. End the current one before the
          next goes live.
        </p>
      </section>

      {party && stats ? (
        <section className="admin__section">
          <h2 className="admin__h2">{party.name}</h2>
          <div className="admin__stats">
            <Stat label="SOLD" value={`${stats.sold} / ${stats.capacity}`} />
            <Stat label="BOOKINGS" value={String(stats.bookings)} />
            <Stat label="IN THE ROOM" value={String(stats.checkedIn)} />
            <Stat label="TAKINGS" value={money(stats.revenueCents, stats.currency)} />
          </div>

          <div className="admin__tablewrap">
            <table className="admin__table">
              <thead>
                <tr><th>REF</th><th>NAME</th><th>TYPE</th><th>QTY</th><th>PAID</th><th>STATUS</th><th /></tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.ref} className={booking.status === 'cancelled' ? 'is-off' : undefined}>
                    <td className="mono">{booking.ref}</td>
                    <td>{booking.name}<br /><span className="dim">{booking.email}</span></td>
                    <td>{booking.tierName}</td>
                    <td>{booking.quantity}</td>
                    <td>{money(booking.amountCents, booking.currency)}</td>
                    <td>
                      {booking.checkedInAt ? 'in' : booking.status}
                    </td>
                    <td>
                      {booking.status !== 'cancelled' ? (
                        <button type="button" className="linkish" onClick={() => act(() => api.admin.cancel(booking.ref), `${booking.ref} cancelled.`)}>
                          cancel
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {!bookings.length ? (
                  <tr><td colSpan={7} className="dim">Nobody has booked yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <Link className="admin__back" to="/">← back to the party</Link>
    </AdminShell>
  );
}

function CheckInBox({ onResult, onChanged }: { onResult: (message: string) => void; onChanged: () => void }) {
  const [ref, setRef] = useState('');

  return (
    <form
      className="admin__checkin"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!ref.trim()) return;
        try {
          const result = await api.admin.checkIn(ref);
          onResult(
            result.alreadyIn
              ? `⚠ ${result.ref} was already scanned — ${result.name}`
              : `✓ ${result.name} · ${result.admitted} in`
          );
          setRef('');
          onChanged();
        } catch (thrown) {
          onResult(thrown instanceof ApiError ? `✕ ${thrown.message}` : '✕ No.');
        }
      }}
    >
      <label className="field">
        <span>CHECK SOMEONE IN</span>
        <input
          value={ref}
          onChange={(event) => setRef(event.target.value)}
          placeholder="GB-XXXX-XXXX"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <button className="btn btn--big" type="submit">ADMIT</button>
    </form>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat__label">{label}</span>
      <span className="stat__value">{value}</span>
    </div>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="page admin">
      <Grain />
      <main className="page__body">{children}</main>
    </div>
  );
}
