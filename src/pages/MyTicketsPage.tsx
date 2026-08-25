import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Grain, TopBar } from '../components/Chrome';
import { AuthGate } from '../components/AuthGate';
import { useAuth } from '../lib/auth';
import { fetchMyReservations, type MyReservation } from '../reserve';
import { money } from '../content';

export default function MyTicketsPage() {
  return (
    <div className="page">
      <Grain />
      <TopBar cta={{ label: 'BACK', to: '/' }} />
      <main className="page__body">
        <AuthGate title="MY TICKETS" lede="Log in to see your tickets.">
          <TicketsList />
        </AuthGate>
      </main>
    </div>
  );
}

function TicketsList() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<MyReservation[] | null>(null);

  useEffect(() => {
    if (!user) return;
    void fetchMyReservations(user.id).then(setReservations);
  }, [user]);

  if (!reservations) return <p className="book__lede">Loading…</p>;

  const confirmed = reservations.filter((r) => r.status === 'confirmed');
  const pending = reservations.filter((r) => r.status === 'pending');

  if (!confirmed.length) {
    return (
      <>
        <h1 className="book__h">MY TICKETS</h1>
        {pending.length ? (
          <p className="book__lede">
            {pending.length === 1 ? 'Your reservation is' : `${pending.length} of your reservations are`}{' '}
            still being checked — it'll show up here once it's confirmed.
          </p>
        ) : (
          <p className="book__lede">You have no tickets yet. Book one.</p>
        )}
        <Link className="btn btn--big" to="/reserve">RESERVE A SPOT</Link>
      </>
    );
  }

  return (
    <>
      <h1 className="book__h">MY TICKETS</h1>
      {pending.length ? (
        <p className="book__lede">
          {pending.length === 1 ? 'One more reservation is' : `${pending.length} more reservations are`} still
          being checked.
        </p>
      ) : null}
      <ul className="tiers">
        {confirmed.map((reservation) => (
          <li className="tier is-on-sale" key={reservation.id}>
            <span className="tier__name">{reservation.partyName}</span>
            <span className="tier__meta">
              <span className="tier__price">{reservation.quantity} × {reservation.ticket}</span>
              <span className="tier__state">{money(reservation.amount)}</span>
            </span>
            <span className="tier__extra tier__note">{reservation.ref}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
