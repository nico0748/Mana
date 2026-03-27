import * as XLSX from 'xlsx';
import type { Circle, CircleItem } from '../types';

// ---- Column header mapping (Japanese and English) ----
type CircleRow = Pick<Circle, 'name' | 'author' | 'hall' | 'block' | 'number' | 'status' | 'xUrl'>;

const HEADER_MAP: Record<string, keyof CircleRow> = {
  'サークル名': 'name', 'circle': 'name', 'name': 'name',
  '作者名':     'author', 'author': 'author',
  'ホール':     'hall',   'hall': 'hall',
  'ブロック':   'block',  'block': 'block',
  'スペース番号': 'number', 'スペース': 'number', 'number': 'number', 'space': 'number',
  'ステータス': 'status', 'status': 'status',
  'X(Twitter)': 'xUrl', 'x': 'xUrl', 'twitter': 'xUrl', 'xurl': 'xUrl',
};

const VALID_STATUSES = new Set<string>(['pending', 'bought', 'soldout']);

const TEMPLATE_HEADERS = ['サークル名', '作者名', 'ホール', 'ブロック', 'スペース番号', 'ステータス', 'X(Twitter)'];
const TEMPLATE_EXAMPLE = ['例：TYPE-MOON', '武内崇', '東1', 'A', '01a', 'pending', 'https://x.com/example'];
const STATUS_NOTE = ['※ステータスは pending / bought / soldout のいずれか。省略すると pending になります。'];

// ---- Parser ----
export function parseCirclesFile(buffer: ArrayBuffer): CircleRow[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][];

  // Skip leading comment/note rows (starting with ※)
  const dataRows = rows.filter(r => !String(r[0] ?? '').startsWith('※'));
  if (dataRows.length < 2) throw new Error('データが空です');

  const rawHeaders = dataRows[0].map(h => String(h).trim().toLowerCase());
  const fieldMap = rawHeaders.map(h => HEADER_MAP[h] ?? null);

  if (!fieldMap.includes('name')) throw new Error('「サークル名」列が見つかりません');
  if (!fieldMap.includes('hall')) throw new Error('「ホール」列が見つかりません');

  const result: CircleRow[] = [];
  for (let i = 1; i < dataRows.length; i++) {
    const cells = dataRows[i];
    const row: Partial<CircleRow> = {};
    fieldMap.forEach((field, idx) => {
      // status field validated separately below; other fields are strings
      if (field && field !== 'status') (row as Record<string, string>)[field] = String(cells[idx] ?? '').trim();
      if (field === 'status') row.status = String(cells[idx] ?? '').trim() as Circle['status'];
    });
    if (!row.name) continue; // skip blank rows
    result.push({
      name:   row.name,
      author: row.author ?? '',
      hall:   row.hall ?? '',
      block:  row.block ?? '',
      number: row.number ?? '',
      status: VALID_STATUSES.has(row.status ?? '') ? (row.status as Circle['status']) : 'pending',
      xUrl:   row.xUrl || undefined,
    });
  }

  if (result.length === 0) throw new Error('インポートできる行がありません');
  return result;
}

// ---- JSON import ----
export interface CirclesJsonPayload {
  circles: CircleRow[];
  circleItems?: Pick<CircleItem, 'title' | 'type' | 'price' | 'quantity'>[];
}

export function parseCirclesJson(json: string): CircleRow[] {
  const data = JSON.parse(json);
  const raw: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data.circles) ? data.circles : [];
  if (raw.length === 0) throw new Error('有効なサークルデータがありません');
  return raw
    .filter(r => r.name)
    .map(r => ({
      name:   String(r.name ?? ''),
      author: String(r.author ?? ''),
      hall:   String(r.hall ?? ''),
      block:  String(r.block ?? ''),
      number: String(r.number ?? ''),
      status: VALID_STATUSES.has(r.status ?? '') ? (r.status as Circle['status']) : 'pending',
      xUrl:   r.xUrl || undefined,
    }));
}

// ---- Export ----
const dateStr = () => new Date().toISOString().split('T')[0];

function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}

function circlesToRows(circles: Circle[]): Record<string, string | number>[] {
  return circles.map(c => ({
    'サークル名':   c.name,
    '作者名':       c.author,
    'ホール':       c.hall,
    'ブロック':     c.block,
    'スペース番号': c.number,
    'ステータス':   c.status,
    'X(Twitter)':  c.xUrl ?? '',
  }));
}

export function exportCirclesJson(circles: Circle[], circleItems: CircleItem[]): void {
  const payload = { circles, circleItems };
  const json = JSON.stringify(payload, null, 2);
  downloadFile(new File([json], `shopping-list-${dateStr()}.json`, { type: 'application/json' }));
}

export function exportCirclesCsv(circles: Circle[]): void {
  const rows = circlesToRows(circles);
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  downloadFile(new File(['\uFEFF' + csv], `shopping-list-${dateStr()}.csv`, { type: 'text/csv;charset=utf-8' }));
}

export function exportCirclesExcel(circles: Circle[]): void {
  const rows = circlesToRows(circles);
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 24 }, { wch: 16 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 32 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '買い物リスト');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  downloadFile(
    new File([buf], `shopping-list-${dateStr()}.xlsx`, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  );
}

// ---- Template download ----
export function downloadCirclesTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    TEMPLATE_EXAMPLE,
    [],
    STATUS_NOTE,
  ]);

  // Column widths
  ws['!cols'] = [
    { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 32 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '買い物リスト');
  XLSX.writeFile(wb, '買い物リスト_テンプレート.xlsx');
}
