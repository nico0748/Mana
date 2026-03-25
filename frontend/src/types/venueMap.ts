// ============================================================
// 会場マップ構造 型定義
// コミケ等の同人誌即売会の会場レイアウトを表現する
// ============================================================

/** 座標 */
export interface Point {
  x: number;
  y: number;
}

/** 矩形範囲 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** ホールエリア種別 */
export type HallArea = 'east' | 'west' | 'south';

/** ブロック命名体系 */
export type BlockNaming = 'alphabet' | 'hiragana' | 'katakana' | 'alphabet_lower';

/** ホール定義 */
export interface Hall {
  /** ホールID (例: "east1", "west3", "south2") */
  id: string;
  /** エリア種別 */
  area: HallArea;
  /** ホール番号 (1-8) */
  number: number;
  /** 表示ラベル (例: "東1", "西3", "南2") */
  label: string;
  /** このホール内のブロック一覧 */
  blocks: Block[];
  /** ホールの描画範囲 (相対座標 0-100) */
  bounds: Rect;
}

/** ブロック（島）定義 */
export interface Block {
  /** ブロックID (例: "east1_A", "east3_ア") */
  id: string;
  /** 所属ホールID */
  hallId: string;
  /** ブロック名 (例: "A", "あ", "ア", "a") */
  name: string;
  /** 命名体系 */
  naming: BlockNaming;
  /** このブロックのスペース数 (片側の卓数) */
  spaceCount: number;
  /** ブロック中心の相対座標 (ホール内 0-100) */
  position: Point;
  /** 島の向き */
  orientation: 'horizontal' | 'vertical';
  /** 壁サークルか */
  isWall: boolean;
}

/** スペース（個別サークルの配置場所） */
export interface Space {
  /** スペースID (例: "east1_A_01a") */
  id: string;
  /** 所属ブロックID */
  blockId: string;
  /** スペース番号 (01-99) */
  number: number;
  /** a側 / b側 */
  side: 'a' | 'b';
  /** 描画座標 (ホール内相対座標 0-100) */
  position: Point;
}

/** ホール間の接続定義 */
export interface HallConnection {
  /** 接続元ホールID */
  fromHallId: string;
  /** 接続先ホールID */
  toHallId: string;
  /** 接続タイプ */
  type: 'direct' | 'corridor' | 'bridge';
  /** 移動コスト（距離的な重み） */
  weight: number;
  /** 接続元の出入口座標 */
  fromPosition: Point;
  /** 接続先の出入口座標 */
  toPosition: Point;
}

/**
 * イベント会場の構成定義
 * 特定のイベント開催回における会場レイアウト全体を表す
 */
export interface VenueLayout {
  /** レイアウトID */
  id: string;
  /** イベント名 (例: "コミックマーケット105") */
  eventName: string;
  /** 略称 (例: "C105") */
  eventCode: string;
  /** ホール一覧 */
  halls: Hall[];
  /** ホール間接続 */
  connections: HallConnection[];
}
