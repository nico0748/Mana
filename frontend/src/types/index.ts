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
