import Dexie, { type Table } from 'dexie';
import { type Book } from '../types';

class ManaDatabase extends Dexie {
  books!: Table<Book>;

  constructor() {
    super('mana-library');
    this.version(1).stores({
      books: 'id, title, author, createdAt, updatedAt',
    });
  }
}

export const db = new ManaDatabase();
