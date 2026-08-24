import type {
  AdminBooking,
  AdminPartySummary,
  BookingCreated,
  HomePayload,
  Party,
  PartyStats,
  Ticket
} from './types';

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: 'include',
      headers: init?.body ? { 'content-type': 'application/json' } : undefined,
      ...init
    });
  } catch {
    throw new ApiError('Can’t reach the server.', 0);
  }

  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : {};

  if (!response.ok) {
    const detail = body as { error?: string; code?: string };
    throw new ApiError(detail.error ?? 'Something went wrong.', response.status, detail.code);
  }
  return body as T;
}

export const api = {
  home: () => request<HomePayload>('/party'),

  book: (input: { tierId: number; name: string; email: string; quantity: number }) =>
    request<BookingCreated>('/bookings', { method: 'POST', body: JSON.stringify(input) }),

  ticket: (ref: string) => request<Ticket>(`/bookings/${encodeURIComponent(ref)}`),

  admin: {
    login: (password: string) =>
      request<{ ok: true }>('/admin/login', { method: 'POST', body: JSON.stringify({ password }) }),
    logout: () => request<{ ok: true }>('/admin/logout', { method: 'POST' }),
    session: () => request<{ ok: true }>('/admin/session'),
    parties: () => request<{ parties: AdminPartySummary[] }>('/admin/parties'),
    party: (id: number) =>
      request<{ party: Party; status: string; stats: PartyStats }>(`/admin/parties/${id}`),
    bookings: (id: number) =>
      request<{ bookings: AdminBooking[]; stats: PartyStats }>(`/admin/parties/${id}/bookings`),
    publish: (id: number) => request<{ ok: true }>(`/admin/parties/${id}/publish`, { method: 'POST' }),
    archive: (id: number) => request<{ ok: true }>(`/admin/parties/${id}/archive`, { method: 'POST' }),
    updateTier: (id: number, patch: { priceCents?: number; quantity?: number; name?: string }) =>
      request<{ ok: true }>(`/admin/tiers/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    checkIn: (ref: string) =>
      request<{ ref: string; name: string; admitted: number; alreadyIn: boolean }>(
        '/admin/checkin',
        { method: 'POST', body: JSON.stringify({ ref }) }
      ),
    cancel: (ref: string) =>
      request<{ ok: true }>(`/admin/bookings/${encodeURIComponent(ref)}/cancel`, { method: 'POST' })
  }
};

export const money = (cents: number, currency = 'EUR') =>
  cents === 0
    ? 'FREE'
    : new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency,
        minimumFractionDigits: cents % 100 === 0 ? 0 : 2
      }).format(cents / 100);
