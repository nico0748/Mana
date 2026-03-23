import { syncApi } from '../lib/api';

const filename = () => `doujin-pp-${new Date().toISOString().split('T')[0]}.json`;

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
    const data = await syncApi.exportBooks();
    const json = JSON.stringify(data, null, 2);
    const file = new File([json], filename(), { type: 'application/json' });

    if (isShareSupported) {
      try {
        await navigator.share({ title: '同人++', text: 'doujin++ backup data', files: [file] });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('Share failed, falling back to download:', err);
      }
    }

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
    await syncApi.importBooks(books);
  };

  return { exportBooks, importBooks };
};
