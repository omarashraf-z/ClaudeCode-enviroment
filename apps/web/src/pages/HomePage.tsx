import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Countdown } from '../components/Countdown';
import { Grain, SiteFooter, Ticker, TopBar } from '../components/Chrome';
import { useParty } from '../hooks/useParty';
import { usePartyState } from '../hooks/useCountdown';
import { useAccent } from '../hooks/useTheme';
import { downloadIcs } from '../ics';
import { money } from '../api';
import type { ArchiveEntry, Party, PartyState } from '../types';

const TICKER = [
  'ONE PARTY AT A TIME',
  'NO RESIDENCY',
  'NO SERIES',
  'NO SECOND CHANCE',
  'WHEN IT’S GONE IT’S GONE'
];

function statusLabel(state: PartyState, party: Party | null): string {
  if (!party) return 'NOTHING PLANNED';
  if (state === 'live') return 'HAPPENING NOW';
  if (state === 'over') return 'IT’S OVER';
  if (party.soldOut) return 'SOLD OUT';
  if (party.ticketsLeft <= 50) return 'LAST TICKETS';
  return 'ON SALE';
}

export default function HomePage() {
  const { data, error, loading } = useParty();
  const party = data?.party ?? null;
  const state = usePartyState(party);
  useAccent(party?.accent, party?.accentInk);

  if (loading) return <Booting />;
  if (error) return <Broken message={error} />;

  const archive = data?.archive ?? [];
  const bookable = state === 'upcoming' || state === 'live';
  const canBuy = bookable && !!party && !party.soldOut;

  return (
    <div className={state === 'quiet' || state === 'over' ? 'is-quiet' : undefined}>
      <Grain />
      <TopBar cta={canBuy ? { label: 'TICKETS', to: '/book' } : null} />

      <main id="main">
        {party ? (
          <PartyHero party={party} state={state} canBuy={canBuy} />
        ) : (
          <QuietHero />
        )}

        <Ticker words={party && state !== 'over' ? [`${party.name} · ${party.dateLine}`, ...TICKER] : TICKER} />

        {party && state !== 'over' ? (
          <>
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

            <TicketSection party={party} canBuy={canBuy} />
            <VenueSection party={party} />
          </>
        ) : null}

        {party ? (
          <section className="sec creed" id="creed">
            <p className="creed__big">ONE PARTY.<br />ONE NIGHT.<br />THEN IT’S GONE.</p>
            <p className="creed__body">{party.creed}</p>
          </section>
        ) : null}

        <Ticker words={TICKER} reverse />
        <ArchiveSection entries={archive} />
      </main>

      <SiteFooter />
    </div>
  );
}

function PartyHero({ party, state, canBuy }: { party: Party; state: PartyState; canBuy: boolean }) {
  const label = statusLabel(state, party);
  const dead = state === 'over';

  return (
    <section className="hero" id="top">
      <div className="hero__inner">
        <p className="hero__eyebrow">
          <span className={`pill${dead ? ' is-dead' : ''}`}>
            <span className="pill__dot" />
            {label}
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
            <dd>{party.venue.secret ? 'SECRET · dropped 24h before' : `${party.venue.name} · ${party.venue.area}`}</dd>
          </div>
        </dl>

        {state === 'upcoming' ? <Countdown target={party.doorsAt} caption="DOORS IN" /> : null}
        {state === 'live' ? <Countdown target={party.endsAt} caption="ENDS IN" live /> : null}

        <div className="hero__cta">
          {canBuy ? (
            <Link className="btn btn--big" to="/book">GET IN</Link>
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
                  title: `GUMMYBEARS — ${party.name}`,
                  start: party.doorsAt,
                  end: party.endsAt,
                  location: party.venue.secret
                    ? 'Location announced 24h before'
                    : `${party.venue.name}, ${party.venue.address ?? party.venue.area}`,
                  description: `${party.subtitle} ${window.location.origin}`
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
            : party.soldOut
              ? 'No door tickets. No guest list. Sorry.'
              : `${party.ticketsLeft} of ${party.capacity} left`}
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

function TicketSection({ party, canBuy }: { party: Party; canBuy: boolean }) {
  return (
    <section className="sec sec--invert" id="tickets">
      <h2 className="sec__h">TICKETS</h2>
      <p className="sec__lede">
        {party.soldOut
          ? `All ${party.capacity} tickets are gone. There is no waiting list.`
          : `${party.capacity} people fit in the room. When they are in, the door closes.`}
      </p>

      <ul className="tiers">
        {party.tiers.map((tier) => {
          const state = tier.soldOut ? 'sold-out' : tier.doorOnly ? 'maybe' : 'on-sale';
          return (
            <li className={`tier is-${state}`} key={tier.id}>
              <span className="tier__name">{tier.name}</span>
              <span className="tier__meta">
                <span className="tier__price">{money(tier.priceCents, tier.currency)}</span>
                <span className="tier__state">
                  {tier.soldOut ? 'GONE' : tier.doorOnly ? 'DOOR ONLY' : `${tier.remaining} LEFT`}
                </span>
              </span>
              {!tier.soldOut && !tier.doorOnly ? (
                <span className="tier__extra">
                  <span className="tier__bar">
                    <i style={{ width: `${Math.max(2, Math.round((tier.remaining / Math.max(1, tier.quantity)) * 100))}%` }} />
                  </span>
                </span>
              ) : tier.note ? (
                <span className="tier__extra tier__note">{tier.note}</span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {canBuy ? (
        <Link className="btn btn--big btn--full" to="/book">GET IN</Link>
      ) : (
        <span className="btn btn--big btn--full is-dead">SOLD OUT</span>
      )}
      <p className="fineprint">
        Tickets are per person and non-transferable at the door. If it sells out, it sells out — we
        don’t add capacity.
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
          {party.venue.secret
            ? 'Sent to ticket holders 24 hours before doors.'
            : party.venue.address}
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

      <h3 className="sub__h">HOUSE RULES</h3>
      <ul className="rules">
        {party.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </section>
  );
}

function ArchiveSection({ entries }: { entries: ArchiveEntry[] }) {
  if (!entries.length) return null;
  return (
    <section className="sec" id="archive">
      <h2 className="sec__h">GONE</h2>
      <p className="sec__lede">Everything we’ve already done. You can’t get into any of it.</p>
      <ul className="archive">
        {entries.map((entry) => (
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

function Booting() {
  return (
    <div className="boot">
      <Grain />
      <p className="boot__mark">GUMMYBEARS</p>
    </div>
  );
}

function Broken({ message }: { message: string }) {
  return (
    <div className="boot">
      <Grain />
      <p className="boot__mark">GUMMYBEARS</p>
      <p className="boot__msg">{message}</p>
    </div>
  );
}
