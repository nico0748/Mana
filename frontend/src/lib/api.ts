import type {
  Announcement, AnnouncementCategory,
  Book, Circle, CircleItem, Distribution, DoujinEvent, VenueMap,
  EventTemplate, EventTemplateSummary, EventTemplateAdminView, EventTemplateStatus,
  Faq,
} from '../types';
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

// ── Announcements ──────────────────────────────────────────────────────────
export interface AnnouncementInput {
  title: string;
  body: string;
  imageUrl?: string | null;
  category: AnnouncementCategory;
  // epoch ms。投稿時 / 編集時の任意指定。未指定なら作成時はサーバ時刻、更新時は変更なし。
  createdAt?: number;
}

export const announcementsApi = {
  // /about ページから認証なしで取得する公開エンドポイント
  list: () => req<Announcement[]>('/public/announcements'),
  create: (data: AnnouncementInput) =>
    req<Announcement>('/admin/announcements', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<AnnouncementInput>) =>
    req<Announcement>(`/admin/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    req<void>(`/admin/announcements/${id}`, { method: 'DELETE' }),
};

// ── Event templates ────────────────────────────────────────────────────────
export const eventTemplatesApi = {
  // 公開: 承認済み一覧（画像なし summary）
  listPublic: () => req<EventTemplateSummary[]>('/public/event-templates'),
  // 公開: 詳細（imageDataUrl 含む）
  getPublic: (id: string) => req<EventTemplate>(`/public/event-templates/${id}`),
  // ログインユーザー: 自分のイベントを申請
  submit: (eventId: string) =>
    req<EventTemplateAdminView>('/event-templates', { method: 'POST', body: JSON.stringify({ eventId }) }),
  listMine: () => req<EventTemplateAdminView[]>('/event-templates/mine'),
  // 管理者
  adminList: (status?: EventTemplateStatus) => {
    const qs = status ? `?status=${status}` : '';
    return req<EventTemplateAdminView[]>(`/admin/event-templates${qs}`);
  },
  adminUpdate: (id: string, data: { status: EventTemplateStatus; rejectionReason?: string | null }) =>
    req<EventTemplateAdminView>(`/admin/event-templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  adminDelete: (id: string) =>
    req<void>(`/admin/event-templates/${id}`, { method: 'DELETE' }),
};

// ── FAQ ────────────────────────────────────────────────────────────────────
export interface FaqInput {
  question: string;
  answer: string;
  order?: number;
}

export const faqsApi = {
  // 公開: /about の FAQ セクションから取得（認証不要）
  list: () => req<Faq[]>('/public/faqs'),
  // 管理者
  create: (data: FaqInput) =>
    req<Faq>('/admin/faqs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<FaqInput>) =>
    req<Faq>(`/admin/faqs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    req<void>(`/admin/faqs/${id}`, { method: 'DELETE' }),
};

// ── Sync ───────────────────────────────────────────────────────────────────
export const syncApi = {
  exportBooks: () => req<{ books: Book[] }>('/sync/export'),
  importBooks: (books: Book[]) =>
    req<{ imported: number }>('/sync/import', { method: 'POST', body: JSON.stringify({ books }) }),
};

// ── Me / Plan ──────────────────────────────────────────────────────────────
export type Plan = 'free' | 'pro';
export type Role = 'user' | 'admin';
export type ResourceKey = 'books' | 'circles' | 'events' | 'distributions' | 'venueMaps';

export interface MeResponse {
  user: {
    firebaseUid: string;
    email: string | null;
    role: Role;
    proOverride: boolean;
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

// ── Admin ──────────────────────────────────────────────────────────────────
export interface AdminUser {
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  role: Role;
  proOverride: boolean;
  effectivePlan: Plan;
  planStatus: string;
  planExpiresAt: number | null;
  isInitialAdmin: boolean;
  createdAt: number;
}

export interface AdminAuditLogEntry {
  id: string;
  actorUid: string;
  action: string;
  targetUid: string | null;
  before: unknown;
  after: unknown;
  ip?: string | null;
  createdAt: number;
}

export interface AdminStats {
  totalUsers: number;
  adminCount: number;
  proOverrideCount: number;
  paidProCount: number;
  recentAuditLog: AdminAuditLogEntry[];
}

export const adminApi = {
  stats: () => req<AdminStats>('/admin/stats'),
  listUsers: (params: { q?: string; cursor?: string; limit?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.cursor) search.set('cursor', params.cursor);
    if (params.limit) search.set('limit', String(params.limit));
    const qs = search.toString();
    return req<{ users: AdminUser[]; nextCursor: string | null }>(
      `/admin/users${qs ? `?${qs}` : ''}`,
    );
  },
  updateUser: (uid: string, data: { role?: Role; proOverride?: boolean }) =>
    req<AdminUser>(`/admin/users/${encodeURIComponent(uid)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  auditLog: (params: { cursor?: string; limit?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.cursor) search.set('cursor', params.cursor);
    if (params.limit) search.set('limit', String(params.limit));
    const qs = search.toString();
    return req<{ logs: AdminAuditLogEntry[]; nextCursor: string | null }>(
      `/admin/audit-log${qs ? `?${qs}` : ''}`,
    );
  },
  syncFirebase: () =>
    req<{ created: number; updated: number; total: number; durationMs: number }>(
      '/admin/sync-firebase',
      { method: 'POST' },
    ),
};
