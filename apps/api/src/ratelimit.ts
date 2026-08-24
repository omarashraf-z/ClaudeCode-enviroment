/** A small fixed-window limiter. In-process, which is right for one box;
 *  put a real limiter in front if you ever run more than one. */
import type { NextFunction, Request, Response } from 'express';

interface Window {
  count: number;
  resetAt: number;
}

export function rateLimit(options: { windowMs: number; max: number; key?: string }) {
  const hits = new Map<string, Window>();

  return function limiter(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now();
    const id = `${options.key ?? req.path}:${req.ip ?? 'unknown'}`;
    const current = hits.get(id);

    if (!current || current.resetAt <= now) {
      hits.set(id, { count: 1, resetAt: now + options.windowMs });
    } else if (current.count >= options.max) {
      res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      res.status(429).json({ error: 'Slow down.' });
      return;
    } else {
      current.count += 1;
    }

    /* Opportunistic sweep so the map cannot grow without bound. */
    if (hits.size > 5000) {
      for (const [key, window] of hits) if (window.resetAt <= now) hits.delete(key);
    }
    next();
  };
}
