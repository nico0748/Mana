import Dexie, { type Table } from 'dexie';
import { type Book } from '../types';

class ManaDatabase extends Dexie {
  books!: Table<Book>;

  constructor() {
    super('mana-library');
    this.version(1).stores({
      books: 'id, title, author, createdAt, updatedAt',
    });
    this.version(2).stores({
      books: 'id, title, author, ndcCode, createdAt, updatedAt',
    });
  }
}

export const db = new ManaDatabase();
