import type { Book, Circle, CircleItem, Distribution, DoujinEvent, VenueMap } from '../types';
import { auth } from './firebase';

const BASE = '/api';

export class ApiError extends Error {
  status: number;
  payload: any;
  constructor(status: number, message: string, payload: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let payload: any = null;
    try { payload = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
    throw new ApiError(res.status, `API ${res.status}: ${text}`, payload);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Books ──────────────────────────────────────────────────────────────────
export const booksApi = {
  list: () => req<Book[]>('/books'),
  create: (data: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) =>
    req<Book>('/books', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<Book, 'id' | 'createdAt'>>) =>
    req<Book>(`/books/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => req<void>(`/books/${id}`, { method: 'DELETE' }),
};

// ── Events ─────────────────────────────────────────────────────────────────
export const eventsApi = {
  list: () => req<DoujinEvent[]>('/events'),
  create: (data: Omit<DoujinEvent, 'id' | 'createdAt' | 'updatedAt'>) =>
    req<DoujinEvent>('/events', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Pick<DoujinEvent, 'name' | 'date' | 'budget'>>) =>
    req<DoujinEvent>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => req<void>(`/events/${id}`, { method: 'DELETE' }),
};

// ── Circles ────────────────────────────────────────────────────────────────
export const circlesApi = {
  list: () => req<Circle[]>('/circles'),
  create: (data: Omit<Circle, 'id' | 'createdAt' | 'updatedAt'>) =>
    req<Circle>('/circles', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<Circle, 'id' | 'createdAt'>>) =>
    req<Circle>(`/circles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => req<void>(`/circles/${id}`, { method: 'DELETE' }),
  bulkCreate: (rows: Omit<Circle, 'id' | 'createdAt' | 'updatedAt'>[]) =>
    req<Circle[]>('/circles/bulk', { method: 'POST', body: JSON.stringify(rows) }),
};

// ── CircleItems ────────────────────────────────────────────────────────────
export const circleItemsApi = {
  list: () => req<CircleItem[]>('/circle-items'),
  create: (data: Omit<CircleItem, 'id' | 'status' | 'onlineStatus' | 'addedToLibraryBookId'>) =>
    req<CircleItem>('/circle-items', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<CircleItem, 'id' | 'circleId'>>) =>
    req<CircleItem>(`/circle-items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => req<void>(`/circle-items/${id}`, { method: 'DELETE' }),
};

// ── VenueMaps ──────────────────────────────────────────────────────────────
export const venueMapsApi = {
  list: () => req<VenueMap[]>('/venue-maps'),
  upsert: (data: Omit<VenueMap, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) =>
    req<VenueMap>('/venue-maps', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<VenueMap, 'id' | 'createdAt'>>) =>
    req<VenueMap>(`/venue-maps/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => req<void>(`/venue-maps/${id}`, { method: 'DELETE' }),
};

// ── Distributions ──────────────────────────────────────────────────────────
export const distributionsApi = {
  list: () => req<Distribution[]>('/distributions'),
  create: (data: Omit<Distribution, 'id' | 'createdAt' | 'updatedAt'>) =>
    req<Distribution>('/distributions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Omit<Distribution, 'id' | 'createdAt'>>) =>
    req<Distribution>(`/distributions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => req<void>(`/distributions/${id}`, { method: 'DELETE' }),
};

// ── Sync ───────────────────────────────────────────────────────────────────
export const syncApi = {
  exportBooks: () => req<{ books: Book[] }>('/sync/export'),
  importBooks: (books: Book[]) =>
    req<{ imported: number }>('/sync/import', { method: 'POST', body: JSON.stringify({ books }) }),
};

// ── Me / Plan ──────────────────────────────────────────────────────────────
export type Plan = 'free' | 'pro';
export type ResourceKey = 'books' | 'circles' | 'events' | 'distributions' | 'venueMaps';

export interface MeResponse {
  user: {
    firebaseUid: string;
    email: string | null;
    plan: Plan;
    planStatus: string;
    planInterval: 'monthly' | 'yearly' | null;
    planExpiresAt: number | null;
    cancelAtPeriodEnd: boolean;
    hasStripeCustomer: boolean;
  };
  limits: Record<ResourceKey, number | null>;
  usage: Record<ResourceKey, number>;
}

export const meApi = {
  get: () => req<MeResponse>('/me'),
};

// ── Billing ────────────────────────────────────────────────────────────────
export const billingApi = {
  checkout: (interval: 'monthly' | 'yearly') =>
    req<{ url: string }>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ interval }),
    }),
  portal: () =>
    req<{ url: string }>('/billing/portal', { method: 'POST' }),
};
