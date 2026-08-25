import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Countdown } from '../components/Countdown';
import { Grain, SiteFooter, Ticker, TopBar } from '../components/Chrome';
import { usePartyState, type PartyState } from '../hooks/useCountdown';
import { useAccent } from '../hooks/useTheme';
import { downloadIcs } from '../ics';
import { SITE, money, type Party } from '../content';
import { fetchTaken } from '../reserve';

const TICKER = [
  'ONE PARTY AT A TIME',
  'NO RESIDENCY',
  'NO SERIES',
  'NO SECOND CHANCE',
  'WHEN IT’S GONE IT’S GONE'
];

export default function HomePage() {
  const party = SITE.party;
  const state = usePartyState(party);
  useAccent(party?.accent, party?.accentInk);

  /* How many are gone, straight from the reservations sheet. Optional: with
     no desk configured, or none reachable, the counters simply don't show. */
  const [taken, setTaken] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    void fetchTaken().then(setTaken);
  }, []);

  const left = party ? remaining(party, taken) : 0;
  const soldOut = party ? left <= 0 && taken !== null : false;
  const open = (state === 'upcoming' || state === 'live') && !soldOut;

  return (
    <div className={state === 'quiet' || state === 'over' ? 'is-quiet' : undefined}>
      <Grain />
      <TopBar cta={open ? { label: 'RESERVE', to: '/reserve' } : null} />

      <main id="main">
        {party ? (
          <PartyHero party={party} state={state} open={open} left={left} showLeft={taken !== null} />
        ) : (
          <QuietHero />
        )}

        <Ticker words={party && state !== 'over' ? [`${party.name} · ${party.dateLine}`, ...TICKER] : TICKER} />

        {party && state !== 'over' ? (
          <>
            {party.lineup?.length ? (
              <section className="sec" id="lineup">
                <h2 className="sec__h">THE NIGHT</h2>
                <ol className="lineup">
                  {party.lineup.map((act) => (
                    <li className={`lineup__item${act.headline ? ' is-headline' : ''}`} key={`${act.time}-${act.name}`}>
                      <span className="lineup__time">{act.time}</span>
                      <div className="lineup__body">
                        <p className="lineup__name">{act.name}</p>
                        {act.note ? <p className="lineup__note">{act.note}</p> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            <TicketSection party={party} open={open} taken={taken} />
            <VenueSection party={party} />
          </>
        ) : null}

        {party?.creed ? (
          <section className="sec creed" id="creed">
            <p className="creed__big">ONE PARTY.<br />ONE NIGHT.<br />THEN IT’S GONE.</p>
            <p className="creed__body">{party.creed}</p>
          </section>
        ) : null}

        <Ticker words={TICKER} reverse />
        <ArchiveSection />
      </main>

      <SiteFooter />
    </div>
  );
}

function remaining(party: Party, taken: Record<string, number> | null): number {
  const capacity = party.tickets
    .filter((ticket) => !ticket.doorOnly)
    .reduce((total, ticket) => total + ticket.quantity, 0);
  if (!taken) return capacity;
  const gone = Object.values(taken).reduce((total, count) => total + count, 0);
  return Math.max(0, Math.min(capacity, party.capacity) - gone);
}

function statusLabel(state: PartyState, open: boolean, left: number, showLeft: boolean): string {
  if (state === 'live') return 'HAPPENING NOW';
  if (state === 'over') return 'IT’S OVER';
  if (!open) return 'SOLD OUT';
  if (showLeft && left <= 50) return 'LAST TICKETS';
  return 'ON SALE';
}

function PartyHero({
  party, state, open, left, showLeft
}: { party: Party; state: PartyState; open: boolean; left: number; showLeft: boolean }) {
  const dead = state === 'over';

  return (
    <section className="hero" id="top">
      <div className="hero__inner">
        <p className="hero__eyebrow">
          <span className={`pill${dead ? ' is-dead' : ''}`}>
            <span className="pill__dot" />
            {statusLabel(state, open, left, showLeft)}
          </span>
          <span className="hero__vol">VOL. {String(party.volume).padStart(2, '0')}</span>
        </p>

        <h1 className="hero__title">{party.name}</h1>
        {party.subtitle ? <p className="hero__subtitle">{party.subtitle}</p> : null}

        <dl className="facts">
          <div className="facts__row"><dt>DATE</dt><dd>{party.dateLine}</dd></div>
          <div className="facts__row"><dt>DOORS</dt><dd>{party.timeLine}</dd></div>
          <div className="facts__row">
            <dt>WHERE</dt>
            <dd>{party.venue.secret ? 'SECRET · sent to confirmed guests' : `${party.venue.name} · ${party.venue.area}`}</dd>
          </div>
        </dl>

        {state === 'upcoming' ? <Countdown target={party.doorsAt} caption="DOORS IN" /> : null}
        {state === 'live' ? <Countdown target={party.endsAt} caption="ENDS IN" live /> : null}

        <div className="hero__cta">
          {open ? (
            <Link className="btn btn--big" to="/reserve">RESERVE A SPOT</Link>
          ) : (
            <span className="btn btn--big is-dead">{dead ? 'YOU MISSED IT' : 'SOLD OUT'}</span>
          )}
          {!dead ? (
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() =>
                downloadIcs({
                  uid: `vol${party.volume}`,
                  title: `${SITE.brand.name} — ${party.name}`,
                  start: party.doorsAt,
                  end: party.endsAt,
                  location: party.venue.secret
                    ? 'Location sent to confirmed guests'
                    : `${party.venue.name}, ${party.venue.address ?? party.venue.area}`,
                  description: `${party.subtitle ?? ''} ${window.location.href}`
                })
              }
            >
              ADD TO CALENDAR
            </button>
          ) : null}
        </div>

        <p className="hero__left">
          {dead
            ? 'Nothing is planned. That is the point.'
            : !open
              ? 'No door tickets. No guest list. Sorry.'
              : showLeft
                ? `${left} of ${party.capacity} left`
                : `${party.capacity} people. That’s the whole room.`}
        </p>
      </div>
      <div className="scroll-hint" aria-hidden="true">↓</div>
    </section>
  );
}

function QuietHero() {
  return (
    <section className="hero" id="top">
      <div className="hero__inner">
        <p className="hero__eyebrow">
          <span className="pill is-dead"><span className="pill__dot" />NOTHING PLANNED</span>
          <span className="hero__vol">BETWEEN PARTIES</span>
        </p>
        <h1 className="hero__title">NOT YET</h1>
        <p className="hero__subtitle">
          There is no party right now. That is not a bug — it is the whole idea. The next one will
          be here, and nowhere else, when it exists.
        </p>
      </div>
      <div className="scroll-hint" aria-hidden="true">↓</div>
    </section>
  );
}

function TicketSection({
  party, open, taken
}: { party: Party; open: boolean; taken: Record<string, number> | null }) {
  return (
    <section className="sec sec--invert" id="tickets">
      <h2 className="sec__h">TICKETS</h2>
      <p className="sec__lede">
        {party.capacity} people fit in the room. When they are in, the door closes.
      </p>

      <ul className="tiers">
        {party.tickets.map((ticket) => {
          const left = Math.max(0, ticket.quantity - (taken?.[ticket.name] ?? 0));
          const gone = !ticket.doorOnly && taken !== null && left === 0;
          const state = gone ? 'sold-out' : ticket.doorOnly ? 'maybe' : 'on-sale';
          return (
            <li className={`tier is-${state}`} key={ticket.name}>
              <span className="tier__name">{ticket.name}</span>
              <span className="tier__meta">
                <span className="tier__price">{money(ticket.price)}</span>
                <span className="tier__state">
                  {gone ? 'GONE' : ticket.doorOnly ? 'DOOR ONLY' : taken !== null ? `${left} LEFT` : 'ON SALE'}
                </span>
              </span>
              {!gone && !ticket.doorOnly && taken !== null ? (
                <span className="tier__extra">
                  <span className="tier__bar">
                    <i style={{ width: `${Math.max(2, Math.round((left / Math.max(1, ticket.quantity)) * 100))}%` }} />
                  </span>
                </span>
              ) : ticket.note ? (
                <span className="tier__extra tier__note">{ticket.note}</span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {open ? (
        <Link className="btn btn--big btn--full" to="/reserve">RESERVE A SPOT</Link>
      ) : (
        <span className="btn btn--big btn--full is-dead">SOLD OUT</span>
      )}
      <p className="fineprint">
        You pay by {SITE.payment.label} and send us the screenshot. We check every transfer by
        hand and confirm you by email. If it sells out, it sells out — we don’t add capacity.
      </p>
    </section>
  );
}

function VenueSection({ party }: { party: Party }) {
  const [copied, setCopied] = useState(false);

  return (
    <section className="sec" id="info">
      <h2 className="sec__h">WHERE &amp; HOW</h2>
      <div className="venue">
        <p className="venue__name">{party.venue.secret ? 'LOCATION TBA' : party.venue.name}</p>
        <p className="venue__addr">
          {party.venue.secret ? 'Sent to confirmed guests before the night.' : party.venue.address}
        </p>
        {party.venue.note ? <p className="venue__note">{party.venue.note}</p> : null}

        {!party.venue.secret && party.venue.address ? (
          <div className="venue__actions">
            {party.venue.mapUrl ? (
              <a className="btn btn--ghost btn--sm" href={party.venue.mapUrl} target="_blank" rel="noopener">
                OPEN IN MAPS
              </a>
            ) : null}
            <button
              className="btn btn--ghost btn--sm"
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(party.venue.address ?? '').then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1800);
                });
              }}
            >
              {copied ? 'COPIED' : 'COPY ADDRESS'}
            </button>
          </div>
        ) : null}
      </div>

      {party.rules?.length ? (
        <>
          <h3 className="sub__h">HOUSE RULES</h3>
          <ul className="rules">
            {party.rules.map((rule) => <li key={rule}>{rule}</li>)}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function ArchiveSection() {
  if (!SITE.archive.length) return null;
  return (
    <section className="sec" id="archive">
      <h2 className="sec__h">GONE</h2>
      <p className="sec__lede">Everything we’ve already done. You can’t get into any of it.</p>
      <ul className="archive">
        {SITE.archive.map((entry) => (
          <li className="arch" key={entry.volume}>
            <span className="arch__vol">V{String(entry.volume).padStart(2, '0')}</span>
            <span className="arch__name">{entry.name}</span>
            <span className="arch__meta">{entry.dateLine}{entry.venue ? ` · ${entry.venue}` : ''}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
