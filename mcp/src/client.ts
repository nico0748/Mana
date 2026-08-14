/**
 * 同人++ REST API の薄いクライアント。
 * 認証は設定画面で発行した API キー（X-API-Key）を使う。Firebase ID トークンは
 * 有効期限 1 時間で常駐プロセスからは更新できないため、こちらを使う。
 */

export interface DoujinEvent {
  id: string;
  name: string;
  date?: string;
  budget?: number;
  order?: number | null;
  /** 色に付けた名前。{ red: '代理購入' } の形 */
  colorLabels?: Record<string, string> | null;
  createdAt: number;
  updatedAt: number;
}

export interface Circle {
  id: string;
  eventId?: string;
  name: string;
  author: string;
  hall: string;
  block: string;
  number: string;
  order: number;
  status: 'pending' | 'bought' | 'soldout';
  /** 色分け用のパレットキー（red, blue, …）。未設定は null */
  color?: string | null;
  xUrl?: string;
  menuImageUrl?: string;
  /** ピンを置いた会場マップのページ。未設定は 1 ページ目 */
  mapPage?: number | null;
  mapX?: number;
  mapY?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CircleItem {
  id: string;
  circleId: string;
  title: string;
  type: string;
  price: number;
  quantity: number;
  coverUrl?: string;
  status: 'pending' | 'bought' | 'soldout';
}

export interface Book {
  id: string;
  title: string;
  author: string;
  type: 'commercial' | 'doujin';
  circleName?: string;
  isbn?: string;
  coverUrl?: string;
  series?: string;
  genre?: string;
  category?: string;
  ndcCode?: string;
  tags?: string[];
  status: string;
  price?: number;
  memo?: string;
  createdAt: number;
  updatedAt: number;
}

export interface VenueMap {
  id: string;
  eventId?: string;
  hall: string;
  /** 複数ページ PDF の何ページ目か。未設定は 1 */
  page?: number;
  imageDataUrl: string;
  generatedSvg?: string | null;
}

export interface EventTemplate {
  id: string;
  name: string;
  date?: string;
  venueMaps: { hall: string; imageDataUrl: string; generatedSvg?: string | null }[];
  circles: {
    name: string; author: string; hall: string; block: string; number: string;
    order: number; xUrl?: string | null; menuImageUrl?: string | null;
    mapX?: number | null; mapY?: number | null;
  }[];
  hallCount: number;
  circleCount: number;
  createdAt: number;
}

export interface MeResponse {
  user: {
    firebaseUid: string;
    email: string | null;
    role: string;
    plan: string;
    planStatus: string;
    planExpiresAt: number | null;
  };
  limits: Record<string, number | null>;
  usage: Record<string, number>;
}

export class ManaApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`API ${status}: ${body.slice(0, 300)}`);
    this.name = 'ManaApiError';
  }
}

export class ManaClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      throw new ManaApiError(res.status, await res.text().catch(() => ''));
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  private post<T>(path: string, body: unknown) {
    return this.req<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  private put<T>(path: string, body: unknown) {
    return this.req<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  private del(path: string) {
    return this.req<void>(path, { method: 'DELETE' });
  }

  // ── アカウント ──
  getMe() {
    return this.req<MeResponse>('/me');
  }

  // ── 即売会 ──
  listEvents() {
    return this.req<DoujinEvent[]>('/events');
  }

  createEvent(data: Partial<DoujinEvent> & { name: string }) {
    return this.post<DoujinEvent>('/events', data);
  }

  updateEvent(id: string, data: Partial<DoujinEvent>) {
    return this.put<DoujinEvent>(`/events/${id}`, data);
  }

  deleteEvent(id: string) {
    return this.del(`/events/${id}`);
  }

  // ── サークル ──
  listCircles() {
    return this.req<Circle[]>('/circles');
  }

  createCircle(data: Partial<Circle> & { name: string }) {
    return this.post<Circle>('/circles', data);
  }

  updateCircle(id: string, data: Partial<Circle>) {
    return this.put<Circle>(`/circles/${id}`, data);
  }

  deleteCircle(id: string) {
    return this.del(`/circles/${id}`);
  }

  // ── 頒布物（サークルの購入予定） ──
  listCircleItems() {
    return this.req<CircleItem[]>('/circle-items');
  }

  createCircleItem(data: Partial<CircleItem> & { circleId: string; title: string }) {
    return this.post<CircleItem>('/circle-items', data);
  }

  updateCircleItem(id: string, data: Partial<CircleItem>) {
    return this.put<CircleItem>(`/circle-items/${id}`, data);
  }

  deleteCircleItem(id: string) {
    return this.del(`/circle-items/${id}`);
  }

  // ── 蔵書 ──
  listBooks() {
    return this.req<Book[]>('/books');
  }

  createBook(data: Partial<Book> & { title: string }) {
    return this.post<Book>('/books', data);
  }

  updateBook(id: string, data: Partial<Book>) {
    return this.put<Book>(`/books/${id}`, data);
  }

  deleteBook(id: string) {
    return this.del(`/books/${id}`);
  }

  // ── 会場マップ ──
  listVenueMaps() {
    return this.req<VenueMap[]>('/venue-maps');
  }

  createVenueMap(data: Partial<VenueMap> & { hall: string; imageDataUrl: string }) {
    return this.post<VenueMap>('/venue-maps', data);
  }

  deleteVenueMap(id: string) {
    return this.del(`/venue-maps/${id}`);
  }

  // ── 公式テンプレート（認証不要の公開エンドポイント） ──
  listEventTemplates() {
    return this.req<EventTemplate[]>('/public/event-templates');
  }

  getEventTemplate(id: string) {
    return this.req<EventTemplate>(`/public/event-templates/${id}`);
  }

  /**
   * 楽天ブックス検索。認証不要の公開プロキシなので API キーは不要だが、
   * ベース URL を使い回したいのでここに置く。
   */
  async searchRakuten(title: string): Promise<RakutenItem[]> {
    const url = `${this.baseUrl}/api/public/book-search/rakuten?title=${encodeURIComponent(title)}&hits=10`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { Items?: RakutenItem[] } | RakutenItem[];
    if (Array.isArray(data)) return data;
    return data.Items ?? [];
  }
}

export interface RakutenItem {
  title?: string;
  author?: string;
  publisherName?: string;
  isbn?: string;
  largeImageUrl?: string;
  mediumImageUrl?: string;
  smallImageUrl?: string;
  itemUrl?: string;
}
