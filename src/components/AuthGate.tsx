import { useState } from 'react';
import { useAuth } from '../lib/auth';

/** Blocks whatever it wraps behind a signup/login form. Used on the Reserve
 *  and My Tickets pages, which both require an account. */
export function AuthGate({ title, lede, children }: { title: string; lede: string; children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <>{children}</>;

  return (
    <section className="sec auth">
      <h1 className="book__h">{title}</h1>
      <p className="book__lede">{lede}</p>
      <AuthForm />
    </section>
  );
}

export function AuthForm() {
  const { signUp, signIn } = useAuth();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      if (mode === 'signup') {
        await signUp(username, password);
      } else {
        await signIn(username, password);
      }
    } catch (thrown) {
      setProblem(thrown instanceof Error ? thrown.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <form className="book auth__form" onSubmit={submit}>
      <div className="auth__tabs">
        <button
          type="button"
          className={`auth__tab${mode === 'signup' ? ' is-on' : ''}`}
          onClick={() => setMode('signup')}
        >
          CREATE ACCOUNT
        </button>
        <button
          type="button"
          className={`auth__tab${mode === 'login' ? ' is-on' : ''}`}
          onClick={() => setMode('login')}
        >
          LOG IN
        </button>
      </div>

      <fieldset className="book__group" disabled={busy}>
        <label className="field">
          <span>Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={2}
            maxLength={40}
            autoComplete="username"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            maxLength={100}
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </label>
      </fieldset>

      {problem ? <p className="book__bad" role="alert">{problem}</p> : null}

      <button className="btn btn--big btn--full" type="submit" disabled={busy}>
        {busy ? 'WORKING…' : mode === 'signup' ? 'CREATE ACCOUNT' : 'LOG IN'}
      </button>
    </form>
  );
}
