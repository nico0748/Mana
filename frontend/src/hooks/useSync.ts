import * as XLSX from 'xlsx';
import { syncApi } from '../lib/api';
import type { Book } from '../types';

const dateStr = () => new Date().toISOString().split('T')[0];

const downloadFile = (file: File) => {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
};

// CSV/Excel カラム定義
const BOOK_CSV_COLUMNS = [
  { key: 'title',      label: 'タイトル'     },
  { key: 'author',     label: '著者'         },
  { key: 'circleName', label: 'サークル名'   },
  { key: 'isbn',       label: 'ISBN'         },
  { key: 'type',       label: '種別'         },
  { key: 'category',   label: 'カテゴリ'     },
  { key: 'ndcCode',    label: 'NDCコード'    },
  { key: 'status',     label: 'ステータス'   },
  { key: 'price',      label: '価格'         },
  { key: 'memo',       label: 'メモ'         },
  { key: 'tags',       label: 'タグ'         },
] as const;


function booksToRows(books: Book[]): Record<string, string | number | undefined>[] {
  return books.map(b =>
    Object.fromEntries(
      BOOK_CSV_COLUMNS.map(({ key, label }) => {
        // タグは配列をカンマ区切り文字列に変換
        if (key === 'tags') return [label, (b.tags ?? []).join(',')];
        return [label, (b as any)[key] ?? ''];
      })
    )
  );
}

function rowsToBookPayloads(rows: Record<string, any>[]): Omit<Book, 'id' | 'createdAt' | 'updatedAt'>[] {
  return rows
    .filter(row => row['タイトル'])
    .map(row => {
      const get = (label: string) => {
        const v = row[label];
        return v !== undefined && v !== '' ? String(v) : undefined;
      };
      const priceRaw = get('価格');
      const tagsRaw = get('タグ');
      return {
        title:      get('タイトル') ?? '',
        author:     get('著者') ?? '',
        circleName: get('サークル名'),
        isbn:       get('ISBN'),
        type:       (get('種別') === 'doujin' ? 'doujin' : 'commercial') as Book['type'],
        category:   get('カテゴリ'),
        ndcCode:    get('NDCコード'),
        status:     (get('ステータス') ?? 'owned') as Book['status'],
        price:      priceRaw ? Number(priceRaw) : undefined,
        memo:       get('メモ'),
        tags:       tagsRaw ? tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      };
    });
}

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
  // ── Export ───────────────────────────────────────────────────────────────

  const exportBooksJson = async () => {
    const data = await syncApi.exportBooks();
    const json = JSON.stringify(data, null, 2);
    const file = new File([json], `doujin-pp-${dateStr()}.json`, { type: 'application/json' });

    if (isShareSupported) {
      try {
        await navigator.share({ title: '同人++', text: 'doujin++ backup data', files: [file] });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('Share failed, falling back to download:', err);
      }
    }
    downloadFile(file);
  };

  const exportBooksCsv = async () => {
    const { books } = await syncApi.exportBooks();
    const rows = booksToRows(books);
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    downloadFile(new File(['\uFEFF' + csv], `doujin-pp-${dateStr()}.csv`, { type: 'text/csv;charset=utf-8' }));
  };

  const exportBooksExcel = async () => {
    const { books } = await syncApi.exportBooks();
    const rows = booksToRows(books);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '本棚');
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    downloadFile(
      new File([buf], `doujin-pp-${dateStr()}.xlsx`, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    );
  };

  // ── Import ───────────────────────────────────────────────────────────────

  const importBooks = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (ext === 'json') {
      const json = await file.text();
      const { books } = JSON.parse(json);
      await syncApi.importBooks(books);
      return;
    }

    // CSV / Excel
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const payloads = rowsToBookPayloads(rows);
    if (payloads.length === 0) throw new Error('有効な行がありません');

    // インポートAPIは Book[] を受け取るので仮IDを付与
    const books = payloads.map((p, i) => ({
      ...p,
      id: `import-${Date.now()}-${i}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })) as Book[];
    await syncApi.importBooks(books);
  };

  return { exportBooksJson, exportBooksCsv, exportBooksExcel, importBooks };
};
