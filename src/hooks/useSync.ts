import { db } from '../lib/db';

const filename = () => `mana-library-${new Date().toISOString().split('T')[0]}.json`;

/** Web Share API でファイル共有が使えるか判定 */
const checkShareSupported = (): boolean => {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [new File([''], 'test.json', { type: 'application/json' })] });
  } catch {
    return false;
  }
};

export const isShareSupported = checkShareSupported();

export const useSync = () => {
  const exportBooks = async () => {
    const books = await db.books.toArray();
    const json = JSON.stringify({ books }, null, 2);
    const file = new File([json], filename(), { type: 'application/json' });

    if (isShareSupported) {
      try {
        await navigator.share({
          title: 'Mana Library',
          text: 'My book collection data',
          files: [file],
        });
        return;
      } catch (err) {
        // キャンセル（AbortError）は正常操作なので無視、それ以外はフォールバック
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('Share failed, falling back to download:', err);
      }
    }

    // フォールバック: ファイルダウンロード
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
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
