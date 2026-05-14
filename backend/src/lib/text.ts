// ユーザー入力テキストの正規化ヘルパ。
//
// 目的:
// 1. NFC 正規化で互換文字（U+212A の "K" vs U+004B の "K" 等）の同一視を防止
//    → 重複検出 / 完全一致比較の精度向上、homograph 攻撃の抑止
// 2. trim() で前後の空白文字を除去
// 3. 結果が空文字になった場合は null を返して「未入力」と区別しない
//
// すべてのユーザーテキスト保存ルートで、Prisma に渡す直前に通すこと。

export function normalizeText(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const out = input.normalize('NFC').trim();
  return out.length > 0 ? out : null;
}

/**
 * 指定したフィールドの文字列・文字列配列を NFC 正規化＋trim する。
 * - undefined フィールドは触らない（PATCH 時のフィールド未指定）
 * - null は null のまま（明示的なクリア意図を保つ）
 * - 文字列配列は要素ごとに正規化＋空要素除去＋重複除去
 *
 * URL や Base64 など正規化すると壊れるフィールドは fields に含めないこと。
 */
export function normalizeFields<T extends Record<string, any>>(
  data: T,
  fields: readonly string[],
): T {
  const out: Record<string, any> = { ...data };
  for (const field of fields) {
    if (!(field in out)) continue;
    const value = out[field];
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') {
      out[field] = normalizeText(value);
    } else if (Array.isArray(value)) {
      const seen = new Set<string>();
      const list: string[] = [];
      for (const v of value) {
        if (typeof v !== 'string') {
          continue;
        }
        const n = normalizeText(v);
        if (n && !seen.has(n)) {
          seen.add(n);
          list.push(n);
        }
      }
      out[field] = list;
    }
  }
  return out as T;
}
