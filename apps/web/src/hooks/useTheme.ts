import { useEffect } from 'react';

/** Each party repaints the whole site. The accent is a CSS variable, so this
 *  is the only place any component needs to know about it. */
export function useAccent(accent?: string, accentInk?: string): void {
  useEffect(() => {
    const root = document.documentElement;
    if (accent) root.style.setProperty('--accent', accent);
    if (accentInk) root.style.setProperty('--accent-ink', accentInk);
  }, [accent, accentInk]);
}
