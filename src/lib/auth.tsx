import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { emailForUsername, supabase } from './supabaseClient';
import { withTimeout } from './timeout';

export interface Profile {
  id: string;
  username: string;
  isAdmin: boolean;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  /** True until the initial session check (and profile fetch) resolves. */
  loading: boolean;
  signUp(username: string, password: string): Promise<void>;
  signIn(username: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, is_admin')
    .eq('id', userId)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, username: data.username, isAdmin: data.is_admin };
}

function readAuthError(error: { message: string } | null): string {
  if (!error) return 'Something went wrong. Try again.';
  if (/already registered/i.test(error.message)) return 'That username is taken.';
  if (/invalid login credentials/i.test(error.message)) return 'Wrong username or password.';
  return error.message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    withTimeout(supabase.auth.getSession(), 10000)
      .then(async ({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        if (data.session) setProfile(await loadProfile(data.session.user.id));
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        void loadProfile(nextSession.user.id).then((p) => {
          if (!cancelled) setProfile(p);
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function signUp(username: string, password: string) {
    const trimmed = username.trim();
    if (trimmed.length < 2) throw new Error('Pick a username with at least 2 characters.');
    if (password.length < 6) throw new Error('Password needs at least 6 characters.');

    const { error } = await supabase.auth.signUp({
      email: emailForUsername(trimmed),
      password,
      options: { data: { username: trimmed } }
    });
    if (error) throw new Error(readAuthError(error));
  }

  async function signIn(username: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: emailForUsername(username.trim()),
      password
    });
    if (error) throw new Error(readAuthError(error));
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const value: AuthState = {
    user: session?.user ?? null,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
