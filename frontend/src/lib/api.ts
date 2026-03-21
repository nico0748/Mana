import type { Book, Circle, CircleItem, Distribution, DoujinEvent, VenueMap } from '../types';

const BASE = '/api';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text}`);
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
  create: (data: Omit<CircleItem, 'id'>) =>
    req<CircleItem>('/circle-items', { method: 'POST', body: JSON.stringify(data) }),
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
