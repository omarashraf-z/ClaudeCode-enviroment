import { randomBytes } from 'node:crypto';

const bool = (v: string | undefined, fallback = false) =>
  v === undefined ? fallback : /^(1|true|yes|on)$/i.test(v);

const DEV = (process.env.NODE_ENV ?? 'development') !== 'production';

/** One place for every knob. Nothing else reads process.env. */
export const config = {
  dev: DEV,
  port: Number(process.env.PORT ?? 4000),
  /** Where the SQLite file lives. ':memory:' is used by the tests. */
  databaseUrl: process.env.DATABASE_URL ?? 'data/gummybears.db',
  /** Front-end origin, for CORS and for payment return URLs. */
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',

  admin: {
    password: process.env.ADMIN_PASSWORD ?? (DEV ? 'letmein' : ''),
    /** Sessions are signed with this. Random per boot if unset — which logs
     *  everyone out on restart, so set it in production. */
    secret: process.env.SESSION_SECRET ?? randomBytes(32).toString('hex'),
    sessionHours: Number(process.env.SESSION_HOURS ?? 12)
  },

  payments: {
    /** 'mock' confirms instantly (pay at the door). 'stripe' needs the keys below. */
    provider: (process.env.PAYMENT_PROVIDER ?? 'mock') as 'mock' | 'stripe',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? ''
  },

  /** Booking limits. maxPerBooking also guards the DB CHECK constraint. */
  maxPerBooking: Number(process.env.MAX_PER_BOOKING ?? 4),
  trustProxy: bool(process.env.TRUST_PROXY, false)
};

export function assertProductionConfig(): void {
  if (config.dev) return;
  const missing: string[] = [];
  if (!config.admin.password) missing.push('ADMIN_PASSWORD');
  if (!process.env.SESSION_SECRET) missing.push('SESSION_SECRET');
  if (config.payments.provider === 'stripe' && !config.payments.stripeSecretKey) {
    missing.push('STRIPE_SECRET_KEY');
  }
  if (missing.length) {
    throw new Error(`Refusing to start in production without: ${missing.join(', ')}`);
  }
}
