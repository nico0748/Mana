/**
 * サークルの色分けに使えるパレットのキー。
 * 表示色（16 進）はフロント側の frontend/src/lib/circleColors.ts が持ち、
 * サーバは「知らないキーを保存させない」ための検証だけを担う。
 * 片方だけ増やすと不整合になるので、追加するときは両方を揃えること。
 */
export const CIRCLE_COLOR_KEYS = [
  'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'violet', 'pink',
] as const;

export type CircleColorKey = (typeof CIRCLE_COLOR_KEYS)[number];

export function isCircleColorKey(value: unknown): value is CircleColorKey {
  return typeof value === 'string' && (CIRCLE_COLOR_KEYS as readonly string[]).includes(value);
}

/** 色ラベル 1 件の最大長。UI のチップに収まる範囲に抑える */
export const COLOR_LABEL_MAX_LENGTH = 20;

/**
 * 色ラベル（{ red: "代理購入" }）を検証して正規化する。
 * - 知らない色キーは捨てる
 * - 文字列以外・空文字は捨てる（＝ラベル削除の意味になる）
 * - 長すぎるものは切り詰める
 * 返り値が空オブジェクトなら null 相当として扱ってよい。
 */
export function normalizeColorLabels(input: unknown): Record<string, string> | null {
  if (input === null) return null;
  if (typeof input !== 'object' || Array.isArray(input)) return null;

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!isCircleColorKey(key)) continue;
    if (typeof value !== 'string') continue;
    const trimmed = value.normalize('NFC').trim().slice(0, COLOR_LABEL_MAX_LENGTH);
    if (trimmed) out[key] = trimmed;
  }
  return out;
}
