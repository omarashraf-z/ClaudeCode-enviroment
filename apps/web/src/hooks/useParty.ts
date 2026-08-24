import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { HomePayload } from '../types';

interface State {
  data: HomePayload | null;
  error: string | null;
  loading: boolean;
}

/** The home payload, with a refresh you can call after booking. */
export function useParty(): State & { reload: () => void } {
  const [state, setState] = useState<State>({ data: null, error: null, loading: true });

  const load = useCallback(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true }));
    api
      .home()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ data: null, error: error.message, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);
  return { ...state, reload: load };
}
