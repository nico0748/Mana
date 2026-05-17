import type { Book } from '../types';

// 推しポイントを上、書誌情報を下に配置するデフォルトテンプレート。
// 投稿前に textarea で自由に書き換えられる前提なので、初期値はあえて素朴に。
export function buildBookShareTemplate(book: Book): string {
  const hashtags: string[] = book.type === 'doujin'
    ? ['#同人活動', '#推し本']
    : ['#読書', '#推し本'];
  if (book.tags) {
    for (const tag of book.tags) {
      const sanitized = tag.replace(/[\s#]+/g, '');
      if (sanitized) hashtags.push(`#${sanitized}`);
    }
  }
  return [
    '（ここに推しポイントを書く）',
    '',
    `📖『${book.title}』`,
    `✍️ ${book.author}`,
    hashtags.join(' '),
  ].join('\n');
}

// data: URL / blob: URL / 同一オリジン URL なら成功。
// 外部 URL は CORS で弾かれることがあるため、その場合は null を返す。
export async function coverUrlToFile(coverUrl: string, basename: string): Promise<File | null> {
  try {
    const res = await fetch(coverUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const ext = (blob.type.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
    const safeName = sanitizeFilename(basename);
    return new File([blob], `${safeName}.${ext}`, { type: blob.type || 'image/jpeg' });
  } catch {
    return null;
  }
}

export function canShareFilesWith(file: File): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export type ShareResult = 'shared' | 'opened-intent' | 'cancelled';

// Web Share API で画像同時投稿を試み、未対応 / 失敗時は X の web intent にフォールバック。
// Cancel (ユーザーがシートで閉じた) は 'cancelled' を返し、モーダル側で開いたままにする。
export async function shareBookOnX(text: string, file: File | null): Promise<ShareResult> {
  if (file && canShareFilesWith(file)) {
    try {
      await navigator.share({ text, files: [file] });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    }
  }
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return 'opened-intent';
}

export function downloadBlobFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sanitizeFilename(name: string): string {
  // Windows / macOS 不正文字と制御文字を除去。長さも 50 文字でカット。
  const cleaned = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
  return cleaned.slice(0, 50) || 'cover';
}
