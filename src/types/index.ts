export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  type: 'commercial' | 'doujin';
  category?: string;
  ndcCode?: string;
  status: 'owned' | 'lending' | 'borrowed' | 'wishlist';
  price?: number;
  memo?: string;
  coverUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export type BookStatus = Book['status'];
export type BookType = Book['type'];

export interface Circle {
  id: string;
  name: string;
  author: string;
  hall: string;
  block: string;
  number: string;
  order: number;
  status: 'pending' | 'bought' | 'soldout' | 'skipped';
  menuImageUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CircleItem {
  id: string;
  circleId: string;
  title: string;
  type: 'shinkan' | 'kikan';
  price: number;
  quantity: number;
  coverUrl?: string;
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
