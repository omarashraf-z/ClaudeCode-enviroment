import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

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

  return (
    <header className={`bar${stuck ? ' is-stuck' : ''}`}>
      <Link className="bar__logo" to="/">GUMMYBEARS</Link>
      <p className="bar__motto" aria-hidden="true">ONE PARTY AT A TIME</p>
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
        <a href="https://instagram.com/thegummybeaars" target="_blank" rel="noopener">INSTAGRAM</a>
        <a href="mailto:door@gummybears.party">EMAIL</a>
        <Link to="/admin">DOOR</Link>
      </nav>
      <p className="foot__note">No cookies. No tracking. No newsletter you didn’t ask for.</p>
    </footer>
  );
}
