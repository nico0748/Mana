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
