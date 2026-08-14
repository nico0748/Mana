export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  type: 'commercial' | 'doujin';
  category?: string;
  ndcCode?: string;
  status: 'owned' | 'lending' | 'borrowed' | 'wishlist' | 'wanted';
  price?: number;
  memo?: string;
  coverUrl?: string;
  circleName?: string;
  /** シリーズ（例: 青春ブタ野郎、ソードアート・オンライン） */
  series?: string;
  /** ジャンル（例: 恋愛、バトル、SF、コメディ） */
  genre?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export type BookStatus = Book['status'];
export type BookType = Book['type'];

export interface DoujinEvent {
  id: string;
  name: string;
  date?: string;   // ISO date string e.g. "2024-12-30"
  budget?: number;
  /** MAP ヘッダーの手動並べ替え順。未設定なら開催日などの自動ソートが使われる */
  order?: number | null;
  /** 色に付けた名前。{ red: '代理購入' } の形。即売会ごとに意味づけできる */
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
  /** 色分け用のパレットキー（red, blue, …）。未設定は undefined */
  color?: string | null;
  xUrl?: string;
  menuImageUrl?: string;
  mapX?: number;
  mapY?: number;
  createdAt: number;
  updatedAt: number;
}

export interface VenueMap {
  id: string;
  eventId?: string;
  hall: string;
  imageDataUrl: string;
  generatedSvg?: string;
  createdAt: number;
  updatedAt: number;
}

export type CircleItemOnlineStatus = 'unchecked' | 'available_online' | 'unavailable';

export interface CircleItem {
  id: string;
  circleId: string;
  title: string;
  type: string;
  price: number;
  quantity: number;
  coverUrl?: string;
  status: 'pending' | 'bought' | 'soldout';
  onlineStatus: CircleItemOnlineStatus;
  addedToLibraryBookId?: string | null;
}

export interface EventTemplateVenueMap {
  hall: string;
  imageDataUrl: string;
  generatedSvg: string | null;
}

export interface EventTemplateCircle {
  name: string;
  author: string;
  hall: string;
  block: string;
  number: string;
  order: number;
  xUrl: string | null;
  menuImageUrl: string | null;
  mapX: number | null;
  mapY: number | null;
}

export interface EventTemplateSummary {
  id: string;
  name: string;
  date?: string;
  halls: string[];
  hallCount: number;
  circleCount: number;
  createdAt: number;
}

export interface EventTemplate {
  id: string;
  name: string;
  date?: string;
  venueMaps: EventTemplateVenueMap[];
  circles: EventTemplateCircle[];
  hallCount: number;
  circleCount: number;
  createdAt: number;
}

export type EventTemplateStatus = 'pending' | 'approved' | 'rejected';

export interface EventTemplateAdminView extends EventTemplate {
  status: EventTemplateStatus;
  submittedByUid: string;
  sourceEventId: string | null;
  reviewedByUid: string | null;
  reviewedAt: number | null;
  rejectionReason: string | null;
  updatedAt: number;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export type AnnouncementCategory = 'feature' | 'fix' | 'event' | 'info';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  category: AnnouncementCategory;
  createdAt: number;
  updatedAt: number;
}

export interface Distribution {
  id: string;
  title: string;
  price: number;
  stock: number;
  sold: number;
  coverUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export type {
  Point, Rect, HallArea, BlockNaming,
  Hall, Block, Space, HallConnection, VenueLayout,
} from './venueMap';

export type {
  MapNodeType, MapEdgeType,
  MapNode, MapEdge, VenueGraph,
  PathSegment, PathResult,
} from './pathfinding';
