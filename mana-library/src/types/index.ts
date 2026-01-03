export interface Book {
  id: string;
  uid: string;
  title: string;
  author: string;
  isbn?: string;
  type: 'commercial' | 'doujin';
  category?: string;
  status: 'owned' | 'lending' | 'wishlist';
  memo?: string;
  coverUrl?: string;
  createdAt: any;
}

export type BookStatus = Book['status'];
export type BookType = Book['type'];
