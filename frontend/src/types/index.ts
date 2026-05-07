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
