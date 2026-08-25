import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SITE } from '../content';
import { useAuth } from '../lib/auth';

export function Grain() {
  return <div className="grain" aria-hidden="true" />;
}

export function TopBar({ cta }: { cta?: { label: string; to: string } | null }) {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > window.innerHeight * 0.6);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const { user, profile, signOut } = useAuth();

  return (
    <header className={`bar${stuck ? ' is-stuck' : ''}`}>
      <Link className="bar__logo" to="/">
        <img className="bar__mark" src={`${import.meta.env.BASE_URL}favicon.png`} alt="" aria-hidden="true" />
        GUMMYBEARS
      </Link>
      <nav className="bar__nav">
        {user ? (
          <>
            <Link className="bar__link" to="/my-tickets">MY TICKETS</Link>
            {profile?.isAdmin ? <Link className="bar__link" to="/admin">ADMIN</Link> : null}
            <button className="bar__link bar__link--btn" type="button" onClick={() => void signOut()}>
              LOG OUT
            </button>
          </>
        ) : (
          <Link className="bar__link" to="/login">LOG IN</Link>
        )}
      </nav>
      {cta ? (
        <Link className="bar__cta" to={cta.to}>{cta.label}</Link>
      ) : null}
    </header>
  );
}

export function Ticker({ words, reverse = false }: { words: string[]; reverse?: boolean }) {
  if (!words.length) return null;
  /* Twice through, so the -50% translate loops seamlessly. */
  const doubled = [...words, ...words];
  return (
    <div className={`ticker${reverse ? ' ticker--rev' : ''}`} aria-hidden="true">
      <div className="ticker__track">
        {doubled.map((word, index) => (
          <span key={`${word}-${index}`}>{word} ✳</span>
        ))}
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="foot">
      <p className="foot__mark">GUMMYBEARS</p>
      <nav className="foot__links">
        <a href={SITE.brand.instagram} target="_blank" rel="noopener">INSTAGRAM</a>
        {SITE.brand.email ? <a href={`mailto:${SITE.brand.email}`}>EMAIL</a> : null}
        {SITE.brand.whatsapp ? (
          <a href={SITE.brand.whatsapp} target="_blank" rel="noopener">WHATSAPP</a>
        ) : null}
      </nav>
      <p className="foot__note">No cookies. No tracking. No newsletter you didn’t ask for.</p>
    </footer>
  );
}
