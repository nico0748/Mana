import * as XLSX from 'xlsx';
import type { Circle } from '../types';

// ---- Column header mapping (Japanese and English) ----
type CircleRow = Pick<Circle, 'name' | 'author' | 'hall' | 'block' | 'number' | 'status'>;

const HEADER_MAP: Record<string, keyof CircleRow> = {
  'サークル名': 'name', 'circle': 'name', 'name': 'name',
  '作者名':     'author', 'author': 'author',
  'ホール':     'hall',   'hall': 'hall',
  'ブロック':   'block',  'block': 'block',
  'スペース番号': 'number', 'スペース': 'number', 'number': 'number', 'space': 'number',
  'ステータス': 'status', 'status': 'status',
};

const VALID_STATUSES = new Set<string>(['pending', 'bought', 'soldout', 'skipped']);

const TEMPLATE_HEADERS = ['サークル名', '作者名', 'ホール', 'ブロック', 'スペース番号', 'ステータス'];
const TEMPLATE_EXAMPLE = ['例：TYPE-MOON', '武内崇', '東1', 'A', '01a', 'pending'];
const STATUS_NOTE = ['※ステータスは pending / bought / soldout / skipped のいずれか。省略すると pending になります。'];

/**
 * Parse an Excel workbook buffer into an array of normalized circle rows suitable for import.
 *
 * Each returned row contains the fields `name`, `author`, `hall`, `block`, `number`, and `status`.
 * The `status` value is validated against allowed statuses (`pending`, `bought`, `soldout`, `skipped`) and defaults to `pending` when missing or invalid.
 *
 * @param buffer - An ArrayBuffer containing an XLSX workbook; the first worksheet will be used.
 * @returns An array of parsed circle rows with normalized string fields and a validated `status`.
 * @throws Error with message "データが空です" when the sheet contains no data rows after filtering comment rows.
 * @throws Error with message "「サークル名」列が見つかりません" when a name column is not present.
 * @throws Error with message "「ホール」列が見つかりません" when a hall column is not present.
 * @throws Error with message "インポートできる行がありません" when no importable rows are found.
 */
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
    });
  }

  if (result.length === 0) throw new Error('インポートできる行がありません');
  return result;
}

/**
 * Generate and download an Excel template for circle shopping lists.
 *
 * The downloaded workbook is named "買い物リスト_テンプレート.xlsx" and contains a sheet titled "買い物リスト" with a header row, an example row, an empty spacer row, and a status-note row. Column widths are set for the six template columns to provide suitable display in Excel.
 */
export function downloadCirclesTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    TEMPLATE_EXAMPLE,
    [],
    STATUS_NOTE,
  ]);

  // Column widths
  ws['!cols'] = [
    { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '買い物リスト');
  XLSX.writeFile(wb, '買い物リスト_テンプレート.xlsx');
}
