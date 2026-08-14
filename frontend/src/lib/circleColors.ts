/**
 * サークルの色分けパレット。
 *
 * 用途はジャンル分けや「人からの頼み物 / 自分の購入予定」の区別など、
 * 意味づけはユーザーに委ねる。色そのものが何を指すかは即売会ごとに
 * DoujinEvent.colorLabels で名前を付けられる。
 *
 * キーの一覧は backend/src/lib/circleColors.ts と対になっている。
 * 色を増やすときは両方に足すこと（サーバは未知のキーを保存時に落とす）。
 */

export interface CircleColor {
  key: CircleColorKey;
  /** ラベル未設定のときに使う色名 */
  name: string;
  /** 塗り・輪郭に使う色。暗い背景でも沈まない彩度に揃えてある */
  hex: string;
}

export type CircleColorKey =
  | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'violet' | 'pink';

export const CIRCLE_COLORS: readonly CircleColor[] = [
  { key: 'red',    name: '赤',   hex: '#ef4444' },
  { key: 'orange', name: 'オレンジ', hex: '#f97316' },
  { key: 'yellow', name: '黄',   hex: '#eab308' },
  { key: 'green',  name: '緑',   hex: '#22c55e' },
  { key: 'teal',   name: '青緑', hex: '#14b8a6' },
  { key: 'blue',   name: '青',   hex: '#3b82f6' },
  { key: 'violet', name: '紫',   hex: '#a855f7' },
  { key: 'pink',   name: 'ピンク', hex: '#ec4899' },
] as const;

const BY_KEY = new Map(CIRCLE_COLORS.map(c => [c.key, c]));

export function isCircleColorKey(value: unknown): value is CircleColorKey {
  return typeof value === 'string' && BY_KEY.has(value as CircleColorKey);
}

/** 色キーから表示色を引く。未設定・未知のキーなら null */
export function colorHex(key: string | null | undefined): string | null {
  if (!key) return null;
  return BY_KEY.get(key as CircleColorKey)?.hex ?? null;
}

/** 即売会の色ラベル。未設定ならパレットの色名（「赤」など）に落とす */
export function colorLabel(
  key: string | null | undefined,
  labels: Record<string, string> | null | undefined,
): string {
  if (!key) return '未設定';
  const custom = labels?.[key]?.trim();
  if (custom) return custom;
  return BY_KEY.get(key as CircleColorKey)?.name ?? '未設定';
}

/** ラベルが付いている色だけを、パレットの並び順で返す */
export function labeledColors(
  labels: Record<string, string> | null | undefined,
): { key: CircleColorKey; hex: string; label: string }[] {
  if (!labels) return [];
  return CIRCLE_COLORS
    .filter(c => labels[c.key]?.trim())
    .map(c => ({ key: c.key, hex: c.hex, label: labels[c.key].trim() }));
}
