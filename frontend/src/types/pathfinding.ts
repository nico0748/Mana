// ============================================================
// 経路探索グラフ 型定義
// ダイクストラ法による会場内最短経路探索のためのデータ構造
// ============================================================

import type { Point } from './venueMap';

/** ノード種別 */
export type MapNodeType = 'space' | 'aisle' | 'entrance' | 'exit' | 'junction';

/** エッジ種別 */
export type MapEdgeType = 'walkway' | 'aisle' | 'hall_connection' | 'entrance';

/** グラフノード（移動可能な地点） */
export interface MapNode {
  /** ノードID (例: "east1_A_01a", "east1_aisle_3") */
  id: string;
  /** ノード種別 */
  type: MapNodeType;
  /** 所属ホールID */
  hallId: string;
  /** 座標 */
  position: Point;
  /** 表示ラベル */
  label?: string;
}

/** グラフエッジ（ノード間の移動経路） */
export interface MapEdge {
  /** 接続元ノードID */
  from: string;
  /** 接続先ノードID */
  to: string;
  /** コスト（距離ベースの重み） */
  weight: number;
  /** エッジ種別 */
  type: MapEdgeType;
  /** 双方向か */
  bidirectional: boolean;
}

/** 会場グラフ全体 */
export interface VenueGraph {
  /** ノード辞書 */
  nodes: Map<string, MapNode>;
  /** 全エッジ */
  edges: MapEdge[];
  /** 隣接リスト */
  adjacencyList: Map<string, Array<{ nodeId: string; weight: number }>>;
}

/** 経路セグメント（表示用の1区間） */
export interface PathSegment {
  /** 区間の開始ノード */
  from: MapNode;
  /** 区間の終了ノード */
  to: MapNode;
  /** この区間のコスト */
  cost: number;
  /** 案内テキスト (例: "東1 A01a → 通路を右折") */
  instruction: string;
}

/** 経路探索結果 */
export interface PathResult {
  /** 経路上のノードIDリスト（順序付き） */
  path: string[];
  /** 総コスト */
  totalCost: number;
  /** 表示用の経路セグメント */
  segments: PathSegment[];
}
