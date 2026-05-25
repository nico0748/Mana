// ユーザー入力 URL の安全性チェック。
//
// XSS 対策として、`<a href={...}>` 等に注入される文字列は必ずこのヘルパで判定する。
// `javascript:`, `data:`, `vbscript:` 等のスキームを弾く目的。
// 全角コロン等の Unicode バイパス（`ｊａｖａｓｃｒｉｐｔ：`）に対しては
// `new URL()` パーサが標準化された解釈を行うので、それに乗る。

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

export function isSafeHttpUrl(input: unknown): input is string {
  if (typeof input !== 'string') return false;
  const trimmed = input.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return ALLOWED_PROTOCOLS.has(u.protocol);
  } catch {
    return false;
  }
}

/** 安全な URL ならそのまま（trim 済み）、不正なら undefined を返す */
export function sanitizeHttpUrl(input: unknown): string | undefined {
  return isSafeHttpUrl(input) ? input.trim() : undefined;
}

// 画像 URL 用サニタイザ。
// - 通常は http(s) のみを許可
// - R2 移行前の旧データに `data:image/{png,jpeg,webp,gif,svg+xml};base64,...` が
//   残っているため、後方互換のため画像系の data URL のみ通す
// - `javascript:` / `vbscript:` / `data:text/html` 等の能動的に実行されうる
//   スキームは全て弾く
// 該当: Book.coverUrl, Circle.menuImageUrl, CircleItem.coverUrl, Distribution.coverUrl
const IMAGE_DATA_URL_RE =
  /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/i;

export function isSafeImageUrl(input: unknown): input is string {
  if (typeof input !== 'string') return false;
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (IMAGE_DATA_URL_RE.test(trimmed)) return true;
  try {
    const u = new URL(trimmed);
    return ALLOWED_PROTOCOLS.has(u.protocol);
  } catch {
    return false;
  }
}

/** 画像 URL として安全ならそのまま（trim 済み）、不正なら undefined */
export function sanitizeImageUrl(input: unknown): string | undefined {
  return isSafeImageUrl(input) ? (input as string).trim() : undefined;
}
