import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Grain, TopBar } from '../components/Chrome';
import { AuthGate } from '../components/AuthGate';
import { useAuth } from '../lib/auth';
import { useAccent } from '../hooks/useTheme';
import { usePartyData } from '../lib/partyData';
import { fetchMyReservations, type MyReservation } from '../reserve';
import { SITE, money } from '../content';

export default function MyTicketsPage() {
  const { party } = usePartyData();
  useAccent(party?.accent, party?.accentInk);

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
  const { party } = usePartyData();
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
      {confirmed.map((reservation) => (
        <TicketStub
          key={reservation.id}
          reservation={reservation}
          venue={reservation.partyName === party?.name ? party : null}
        />
      ))}
    </>
  );
}

function TicketStub({
  reservation, venue
}: { reservation: MyReservation; venue: { dateLine: string; timeLine: string; venue: { name: string; area: string } } | null }) {
  return (
    <div className="stub">
      <span className="stub__badge">{reservation.ref}</span>
      <p className="stub__eyebrow">CONFIRMED</p>
      <h2 className="stub__title">{reservation.partyName}</h2>

      {venue ? (
        <ul className="stub__facts">
          <li>{venue.venue.name} · {venue.venue.area}</li>
          <li>{venue.dateLine}</li>
          <li>{venue.timeLine}</li>
        </ul>
      ) : null}

      <div className="stub__cut">
        <div className="stub__barcode" aria-hidden="true" />
        <dl className="stub__list">
          <li><dt>TICKET</dt><span className="fill" /><dd>{reservation.ticket}</dd></li>
          <li><dt>QTY</dt><span className="fill" /><dd>{reservation.quantity}</dd></li>
          <li><dt>NAME</dt><span className="fill" /><dd>{reservation.name}</dd></li>
          <li><dt>PAID</dt><span className="fill" /><dd>{money(reservation.amount)}</dd></li>
        </dl>
      </div>

      <div className="stub__foot">
        <img className="stub__mark" src="/favicon.png" alt="" aria-hidden="true" />
        <p className="stub__brand">
          {SITE.brand.name}
          <small>{SITE.brand.motto}</small>
        </p>
        <div className="stub__grad" aria-hidden="true" />
        <p className="stub__status">CONFIRMED</p>
      </div>
    </div>
  );
}
