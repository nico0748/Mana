import type { Circle } from '../types';
import type { MapCardPosition } from '../contexts/AppSettingsContext';

/**
 * お品書きカードの配置計算。
 *
 * カードは会場マップ画像の外側（左右の余白）に並べ、引き出し線でピンと結ぶ。
 * 座標系は画像の左上を (0,0)、右下を (100,100) とした百分率で、余白に置くため
 * 0 未満・100 超も許容する。ピンの mapX / mapY と同じ空間なので線を直接引ける。
 */

/** カードの実寸（画像幅に対する %）。マップ画像の縦横比に関わらず一定に見えるよう幅だけ持つ */
export const CARD_WIDTH_PCT = 11;

/** 左右の列を画像からどれだけ離すか（%） */
const COLUMN_GAP_PCT = 2;

/** カード同士の縦の隙間（%） */
const ROW_GAP_PCT = 1.5;

/** 引き出し線の色。circleId から安定して決めるので、再描画で色が変わらない */
const LINE_COLORS = [
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#f97316', // orange
  '#22c55e', // green
  '#ec4899', // pink
  '#eab308', // yellow
  '#14b8a6', // teal
];

export function lineColorFor(circleId: string): string {
  let hash = 0;
  for (let i = 0; i < circleId.length; i++) {
    hash = (hash * 31 + circleId.charCodeAt(i)) | 0;
  }
  return LINE_COLORS[Math.abs(hash) % LINE_COLORS.length];
}

export interface PlacedCard {
  circle: Circle;
  /** カード左上の座標（%） */
  x: number;
  y: number;
  /** 引き出し線の始点（カード側の端の中央、%） */
  anchorX: number;
  anchorY: number;
  /** 引き出し線の終点（ピン、%） */
  pinX: number;
  pinY: number;
  color: string;
  /** 手動配置されたものか（リセット可否の判定に使う） */
  manual: boolean;
}

/** カードの高さ（%）。画像の縦横比に応じて、見た目が正方形に近くなるよう補正する */
export function cardHeightPct(imageAspect: number): number {
  // imageAspect = 幅 / 高さ。幅 11% は高さ換算で 11 * aspect % になる。
  // お品書きは縦長が多いので 1.35 倍の縦長カードにする。
  return CARD_WIDTH_PCT * imageAspect * 1.35;
}

/**
 * カードを配置する。
 * 手動位置があればそれを使い、無いものはピンの左右どちら側かで列を決めて
 * ピンの高さ順に上から詰める。
 */
export function layoutCards(
  circles: Circle[],
  saved: Record<string, MapCardPosition> | undefined,
  imageAspect: number,
): PlacedCard[] {
  const cardH = cardHeightPct(imageAspect);

  // 自動配置対象を左右に振り分ける。ピンが左半分なら左の余白、右半分なら右の余白。
  const auto = circles.filter(c => !saved?.[c.id]);
  const left = auto.filter(c => (c.mapX ?? 50) < 50).sort((a, b) => (a.mapY ?? 0) - (b.mapY ?? 0));
  const right = auto.filter(c => (c.mapX ?? 50) >= 50).sort((a, b) => (a.mapY ?? 0) - (b.mapY ?? 0));

  // 行間はカードの高さから決める。固定値にすると縦長のマップでカードが重なる。
  const rowStep = cardH + ROW_GAP_PCT;
  // 1 列に入る枚数。画像の高さを超えたぶんは外側の列へ折り返す。
  const perColumn = Math.max(1, Math.floor(100 / rowStep));
  const columnStep = CARD_WIDTH_PCT + COLUMN_GAP_PCT;

  const autoPos = new Map<string, MapCardPosition>();
  left.forEach((c, i) => {
    const col = Math.floor(i / perColumn);
    autoPos.set(c.id, {
      // 列が増えるほど画像から遠ざける
      x: -(columnStep * (col + 1)),
      y: (i % perColumn) * rowStep,
    });
  });
  right.forEach((c, i) => {
    const col = Math.floor(i / perColumn);
    autoPos.set(c.id, {
      x: 100 + COLUMN_GAP_PCT + columnStep * col,
      y: (i % perColumn) * rowStep,
    });
  });

  return circles.map(circle => {
    const manualPos = saved?.[circle.id];
    const pos = manualPos ?? autoPos.get(circle.id) ?? { x: 0, y: 0 };
    const pinX = circle.mapX ?? 50;
    const pinY = circle.mapY ?? 50;

    // 線はカードのピンに近い側の端から引く。左に置いたカードなら右端、逆なら左端。
    const cardCenterX = pos.x + CARD_WIDTH_PCT / 2;
    const anchorX = cardCenterX < pinX ? pos.x + CARD_WIDTH_PCT : pos.x;

    return {
      circle,
      x: pos.x,
      y: pos.y,
      anchorX,
      anchorY: pos.y + cardH / 2,
      pinX,
      pinY,
      color: lineColorFor(circle.id),
      manual: !!manualPos,
    };
  });
}

/** 設定に保存するときのキー。未分類の即売会は空文字で表す */
export function cardPositionKey(eventId: string | null, hall: string): string {
  return `${eventId ?? ''}::${hall}`;
}

/** スペース表記。ホール・ブロック・番号のうち入っているものだけを繋ぐ */
export function spaceLabel(circle: Circle): string {
  return [circle.hall, circle.block, circle.number].filter(Boolean).join(' ');
}
