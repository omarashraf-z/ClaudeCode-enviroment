import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from './config.js';

const COOKIE = 'gb_admin';

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64url');

function sign(payload: string): string {
  return createHmac('sha256', config.admin.secret).update(payload).digest('base64url');
}

/** Constant-time compare that tolerates different lengths. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function issueSession(): { token: string; maxAgeMs: number } {
  const maxAgeMs = config.admin.sessionHours * 60 * 60 * 1000;
  const payload = b64url(JSON.stringify({ exp: Date.now() + maxAgeMs }));
  return { token: `${payload}.${sign(payload)}`, maxAgeMs };
}

export function verifySession(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { exp: number };
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

export function checkPassword(candidate: string): boolean {
  if (!config.admin.password) return false;
  return safeEqual(candidate, config.admin.password);
}

export function setSessionCookie(res: Response): void {
  const { token, maxAgeMs } = issueSession();
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !config.dev,
    maxAge: maxAgeMs,
    path: '/'
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE, { path: '/' });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const cookies = req.cookies as Record<string, string> | undefined;
  if (!verifySession(cookies?.[COOKIE])) {
    res.status(401).json({ error: 'Not signed in.' });
    return;
  }
  next();
}

export const SESSION_COOKIE = COOKIE;
