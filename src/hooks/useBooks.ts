import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { type Book } from '../types';

export type SortField = 'createdAt' | 'title' | 'author' | 'ndcCode';
export type SortDirection = 'asc' | 'desc';

export const useBooks = (sortField: SortField = 'createdAt', sortDirection: SortDirection = 'desc') => {
  const books = useLiveQuery(async () => {
    const all = await db.books.toArray();
    return all.sort((a, b) => {
      if (sortField === 'ndcCode') {
        const aCode = a.ndcCode ?? '';
        const bCode = b.ndcCode ?? '';
        // NDCコードなしは末尾に
        if (!aCode && !bCode) return 0;
        if (!aCode) return 1;
        if (!bCode) return -1;
        const aNum = parseFloat(aCode);
        const bNum = parseFloat(bCode);
        const cmp = isNaN(aNum) || isNaN(bNum) ? aCode.localeCompare(bCode) : aNum - bNum;
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sortField, sortDirection]);

  const loading = books === undefined;
  const error: string | null = null;

  const addBook = async (bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    await db.books.add({
      ...bookData,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  };

  const updateBook = async (id: string, bookData: Partial<Omit<Book, 'id' | 'createdAt'>>) => {
    await db.books.update(id, { ...bookData, updatedAt: Date.now() });
  };

  const deleteBook = async (id: string) => {
    await db.books.delete(id);
  };

  const uploadImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  return { books: books ?? [], loading, error, addBook, updateBook, deleteBook, uploadImage };
};
