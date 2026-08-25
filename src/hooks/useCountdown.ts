import { useEffect, useState } from 'react';
import type { Party } from '../content';

/** upcoming → live → over, or quiet when there is no party at all. */
export type PartyState = 'quiet' | 'upcoming' | 'live' | 'over';

export interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const split = (ms: number): Remaining => {
  const total = Math.max(0, ms);
  const seconds = Math.floor(total / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
    total
  };
};

/** Ticks once a second, and re-reads the clock rather than counting down
 *  locally, so a backgrounded phone tab comes back correct. */
export function useCountdown(targetIso: string | null): Remaining {
  const [remaining, setRemaining] = useState(() =>
    split(targetIso ? new Date(targetIso).getTime() - Date.now() : 0)
  );

  useEffect(() => {
    if (!targetIso) return;
    const target = new Date(targetIso).getTime();
    const tick = () => setRemaining(split(target - Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetIso]);

  return remaining;
}

/** Where we are in the life of a party, recomputed as the clock passes each
 *  boundary — so a page left open at 22:59 flips itself to HAPPENING NOW. */
export function usePartyState(party: Party | null): PartyState {
  const compute = (): PartyState => {
    if (!party) return 'quiet';
    const now = Date.now();
    if (now < new Date(party.startsAt).getTime()) return 'upcoming';
    if (now < new Date(party.endsAt).getTime()) return 'live';
    return 'over';
  };

  const [state, setState] = useState<PartyState>(compute);

  useEffect(() => {
    setState(compute());
    const id = window.setInterval(() => setState(compute()), 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [party?.startsAt, party?.endsAt, party?.name]);

  return state;
}
