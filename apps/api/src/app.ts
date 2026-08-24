import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { publicRouter } from './routes/public.js';
import { adminRouter } from './routes/admin.js';

const here = dirname(fileURLToPath(import.meta.url));
/** In production the API also serves the built front end, so the whole thing
 *  is one process behind one port. */
const WEB_DIST = resolve(here, '../../web/dist');

export function createApp(): Express {
  const app = express();
  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    cors({
      origin: config.webOrigin,
      credentials: true
    })
  );

  /* Stripe signs the exact bytes, so this route must see the raw body and has
     to be mounted before the JSON parser. */
  app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '64kb' }));
  app.use(cookieParser());

  app.use('/api', publicRouter);
  app.use('/api/admin', adminRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'No such endpoint.' });
  });

  if (existsSync(WEB_DIST)) {
    app.use(express.static(WEB_DIST, { maxAge: '1h', index: false }));
    app.get('*', (_req, res) => {
      res.sendFile(join(WEB_DIST, 'index.html'));
    });
  }

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[api]', error);
    const message =
      config.dev && error instanceof Error ? error.message : 'Something broke on our side.';
    res.status(500).json({ error: message });
  });

  return app;
}
