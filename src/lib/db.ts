import Dexie, { type Table } from 'dexie';
import { type Book, type Circle, type CircleItem, type Distribution, type VenueMap, type DoujinEvent } from '../types';

class ManaDatabase extends Dexie {
  books!: Table<Book>;
  circles!: Table<Circle>;
  circleItems!: Table<CircleItem>;
  distributions!: Table<Distribution>;
  venueMaps!: Table<VenueMap>;
  doujinEvents!: Table<DoujinEvent>;

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
    this.version(4).stores({
      books: 'id, title, author, ndcCode, createdAt, updatedAt',
      circles: 'id, order, status, hall, createdAt, updatedAt',
      circleItems: 'id, circleId',
      distributions: 'id, createdAt, updatedAt',
      venueMaps: 'id, hall, createdAt, updatedAt',
    });
    this.version(5).stores({
      books: 'id, title, author, ndcCode, createdAt, updatedAt',
      circles: 'id, eventId, order, status, hall, createdAt, updatedAt',
      circleItems: 'id, circleId',
      distributions: 'id, createdAt, updatedAt',
      venueMaps: 'id, hall, createdAt, updatedAt',
      doujinEvents: 'id, date, createdAt, updatedAt',
    });
    this.version(6).stores({
      books: 'id, title, author, ndcCode, createdAt, updatedAt',
      circles: 'id, eventId, order, status, hall, createdAt, updatedAt',
      circleItems: 'id, circleId',
      distributions: 'id, createdAt, updatedAt',
      venueMaps: 'id, eventId, hall, createdAt, updatedAt',
      doujinEvents: 'id, date, createdAt, updatedAt',
    });
  }
}

export const db = new ManaDatabase();
