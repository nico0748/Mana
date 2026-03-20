import Dexie, { type Table } from 'dexie';
import { type Book, type Circle, type CircleItem, type Distribution } from '../types';

class ManaDatabase extends Dexie {
  books!: Table<Book>;
  circles!: Table<Circle>;
  circleItems!: Table<CircleItem>;
  distributions!: Table<Distribution>;

  constructor() {
    super('mana-library');
    this.version(1).stores({
      books: 'id, title, author, createdAt, updatedAt',
    });
    this.version(2).stores({
      books: 'id, title, author, ndcCode, createdAt, updatedAt',
    });
    this.version(3).stores({
      books: 'id, title, author, ndcCode, createdAt, updatedAt',
      circles: 'id, order, status, createdAt, updatedAt',
      circleItems: 'id, circleId',
      distributions: 'id, createdAt, updatedAt',
    });
  }
}

export const db = new ManaDatabase();
