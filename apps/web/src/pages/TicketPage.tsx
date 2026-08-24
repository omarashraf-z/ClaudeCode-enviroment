import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { api, money } from '../api';
import { Grain, TopBar } from '../components/Chrome';
import { useAccent } from '../hooks/useTheme';
import { downloadIcs } from '../ics';
import type { Ticket } from '../types';

export default function TicketPage() {
  const { ref = '' } = useParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useAccent(ticket?.party.accent, ticket?.party.accentInk);

  useEffect(() => {
    let cancelled = false;
    api
      .ticket(ref)
      .then((data) => {
        if (cancelled) return;
        setTicket(data);
        /* The QR is just the ticket URL — the door scans it, or types the ref. */
        return QRCode.toDataURL(`${window.location.origin}/ticket/${data.ref}`, {
          margin: 1,
          width: 512,
          color: { dark: '#0b0709', light: '#fff6ea' }
        }).then((url) => {
          if (!cancelled) setQr(url);
        });
      })
      .catch((thrown: Error) => {
        if (!cancelled) setError(thrown.message);
      });
    return () => {
      cancelled = true;
    };
  }, [ref]);

  if (error) {
    return (
      <Shell>
        <h1 className="ticket__h">NO SUCH TICKET</h1>
        <p className="book__lede">{error}</p>
        <Link className="btn btn--big" to="/">BACK TO THE FRONT</Link>
      </Shell>
    );
  }

  if (!ticket) return <Shell><p className="book__wait">Fetching your ticket…</p></Shell>;

  const used = Boolean(ticket.checkedInAt);

  return (
    <Shell>
      <div className="ticket">
        <p className="ticket__eyebrow">
          {ticket.status === 'pending' ? 'NOT PAID YET' : used ? 'ALREADY SCANNED' : 'YOU’RE IN'}
        </p>
        <h1 className="ticket__h">{ticket.party.name}</h1>
        <p className="ticket__sub">
          VOL. {String(ticket.party.volume).padStart(2, '0')} · {ticket.party.dateLine} · {ticket.party.timeLine}
        </p>

        {qr ? <img className="ticket__qr" src={qr} alt={`QR code for booking ${ticket.ref}`} /> : <div className="ticket__qr ticket__qr--wait" />}

        <p className="ticket__ref">{ticket.ref}</p>
        <p className="ticket__hint">Show this at the door, or just read out the reference.</p>

        <dl className="ticket__facts">
          <div><dt>NAME</dt><dd>{ticket.name}</dd></div>
          <div><dt>ADMITS</dt><dd>{ticket.quantity}</dd></div>
          <div><dt>TYPE</dt><dd>{ticket.tierName}</dd></div>
          <div><dt>PAID</dt><dd>{ticket.payAtDoor ? `${money(ticket.amountCents, ticket.currency)} AT THE DOOR` : money(ticket.amountCents, ticket.currency)}</dd></div>
          <div><dt>WHERE</dt><dd>{ticket.party.venue.name}<br />{ticket.party.venue.address}</dd></div>
        </dl>

        <div className="ticket__actions">
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            onClick={() =>
              downloadIcs({
                uid: ticket.ref,
                title: `GUMMYBEARS — ${ticket.party.name}`,
                start: ticket.party.doorsAt,
                end: ticket.party.endsAt,
                location: `${ticket.party.venue.name}, ${ticket.party.venue.address}`,
                description: `Booking ${ticket.ref} · admits ${ticket.quantity}`
              })
            }
          >
            ADD TO CALENDAR
          </button>
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            onClick={() => {
              const url = window.location.href;
              if (navigator.share) void navigator.share({ title: 'My GUMMYBEARS ticket', url });
              else void navigator.clipboard?.writeText(url);
            }}
          >
            SAVE THE LINK
          </button>
        </div>

        {ticket.status === 'pending' ? (
          <p className="ticket__warn">
            This booking is still waiting on payment. It is not valid at the door until it clears.
          </p>
        ) : null}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="page">
      <Grain />
      <TopBar cta={{ label: 'HOME', to: '/' }} />
      <main className="page__body">{children}</main>
    </div>
  );
}
