import { db } from '../lib/db';

export const useSync = () => {
  const exportBooks = async () => {
    const books = await db.books.toArray();
    const json = JSON.stringify({ books }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mana-library-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBooks = async (file: File) => {
    const json = await file.text();
    const { books } = JSON.parse(json);
    for (const book of books) {
      const existing = await db.books.get(book.id);
      if (!existing || book.updatedAt > existing.updatedAt) {
        await db.books.put(book);
      }
    }
  };

  return { exportBooks, importBooks };
};
