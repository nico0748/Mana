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
  xUrl?: string;
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
  imageDataUrl: string;
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

  // ── 即売会 ──
  listEvents() {
    return this.req<DoujinEvent[]>('/events');
  }

  createEvent(data: { name: string; date?: string; budget?: number }) {
    return this.req<DoujinEvent>('/events', { method: 'POST', body: JSON.stringify(data) });
  }

  // ── サークル ──
  listCircles() {
    return this.req<Circle[]>('/circles');
  }

  createCircle(data: Partial<Circle> & { name: string }) {
    return this.req<Circle>('/circles', { method: 'POST', body: JSON.stringify(data) });
  }

  updateCircle(id: string, data: Partial<Circle>) {
    return this.req<Circle>(`/circles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  // ── 頒布物 ──
  listCircleItems() {
    return this.req<CircleItem[]>('/circle-items');
  }

  createCircleItem(data: Partial<CircleItem> & { circleId: string; title: string }) {
    return this.req<CircleItem>('/circle-items', { method: 'POST', body: JSON.stringify(data) });
  }

  // ── 蔵書 ──
  listBooks() {
    return this.req<Book[]>('/books');
  }

  createBook(data: Partial<Book> & { title: string }) {
    return this.req<Book>('/books', { method: 'POST', body: JSON.stringify(data) });
  }

  // ── 会場マップ ──
  listVenueMaps() {
    return this.req<VenueMap[]>('/venue-maps');
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
