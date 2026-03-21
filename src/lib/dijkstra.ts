// ============================================================
// ダイクストラ法 経路探索エンジン
// 会場グラフ上で最短経路を探索する
// ============================================================

import type { VenueGraph, MapNode, MapEdge, PathResult, PathSegment } from '../types/pathfinding';
import type { Hall, HallConnection, Point } from '../types/venueMap';

// ─────────────────────────────────────────────
// グラフ構築
// ─────────────────────────────────────────────

/**
 * ホール・ブロック定義と接続情報からグラフを構築する
 */
export function buildVenueGraph(
  halls: Hall[],
  connections: HallConnection[],
): VenueGraph {
  const nodes = new Map<string, MapNode>();
  const edges: MapEdge[] = [];
  const adjacencyList = new Map<string, Array<{ nodeId: string; weight: number }>>();

  const addNode = (node: MapNode) => {
    nodes.set(node.id, node);
    if (!adjacencyList.has(node.id)) {
      adjacencyList.set(node.id, []);
    }
  };

  const addEdge = (edge: MapEdge) => {
    edges.push(edge);
    adjacencyList.get(edge.from)?.push({ nodeId: edge.to, weight: edge.weight });
    if (edge.bidirectional) {
      adjacencyList.get(edge.to)?.push({ nodeId: edge.from, weight: edge.weight });
    }
  };

  // 各ホールのノードとエッジを生成
  for (const hall of halls) {
    if (hall.blocks.length === 0) continue;

    // ホール入口ノード
    const entranceId = `${hall.id}_entrance`;
    addNode({
      id: entranceId,
      type: 'entrance',
      hallId: hall.id,
      position: { x: hall.bounds.x + hall.bounds.width / 2, y: hall.bounds.y },
      label: `${hall.label} 入口`,
    });

    // 各ブロックのノード
    for (const block of hall.blocks) {
      const blockNodeId = blockToNodeId(hall.id, block.name);
      addNode({
        id: blockNodeId,
        type: 'space',
        hallId: hall.id,
        position: toAbsolutePosition(block.position, hall.bounds),
        label: `${hall.label} ${block.name}`,
      });

      // 入口 → ブロック間のエッジ
      const distToEntrance = euclideanDistance(
        toAbsolutePosition(block.position, hall.bounds),
        nodes.get(entranceId)!.position,
      );
      addEdge({
        from: entranceId,
        to: blockNodeId,
        weight: distToEntrance,
        type: 'walkway',
        bidirectional: true,
      });
    }

    // ブロック間のエッジ（同一ホール内の隣接ブロック）
    for (let i = 0; i < hall.blocks.length - 1; i++) {
      const blockA = hall.blocks[i];
      const blockB = hall.blocks[i + 1];
      const nodeA = blockToNodeId(hall.id, blockA.name);
      const nodeB = blockToNodeId(hall.id, blockB.name);

      const dist = euclideanDistance(
        toAbsolutePosition(blockA.position, hall.bounds),
        toAbsolutePosition(blockB.position, hall.bounds),
      );

      addEdge({
        from: nodeA,
        to: nodeB,
        weight: dist,
        type: 'aisle',
        bidirectional: true,
      });
    }

    // 通路ノード（ホール内の主要通路の交差点）
    const aisleNodes = generateAisleNodes(hall);
    for (const aisleNode of aisleNodes) {
      addNode(aisleNode);

      // 通路ノードと各ブロックを接続
      for (const block of hall.blocks) {
        const blockNodeId = blockToNodeId(hall.id, block.name);
        const blockPos = toAbsolutePosition(block.position, hall.bounds);
        const dist = euclideanDistance(blockPos, aisleNode.position);

        // 近いブロックのみ接続（通路の幅を考慮）
        if (dist < 30) {
          addEdge({
            from: aisleNode.id,
            to: blockNodeId,
            weight: dist,
            type: 'aisle',
            bidirectional: true,
          });
        }
      }
    }
  }

  // ホール間接続のエッジを生成
  for (const conn of connections) {
    const fromHall = halls.find(h => h.id === conn.fromHallId);
    const toHall = halls.find(h => h.id === conn.toHallId);
    if (!fromHall || !toHall) continue;
    if (fromHall.blocks.length === 0 && toHall.blocks.length === 0) continue;

    const fromEntranceId = `${conn.fromHallId}_entrance`;
    const toEntranceId = `${conn.toHallId}_entrance`;

    // 入口ノードが存在しない場合は作成
    if (!nodes.has(fromEntranceId)) {
      addNode({
        id: fromEntranceId,
        type: 'entrance',
        hallId: conn.fromHallId,
        position: toAbsolutePosition(conn.fromPosition, fromHall.bounds),
        label: `${fromHall.label} 入口`,
      });
    }
    if (!nodes.has(toEntranceId)) {
      addNode({
        id: toEntranceId,
        type: 'entrance',
        hallId: conn.toHallId,
        position: toAbsolutePosition(conn.toPosition, toHall.bounds),
        label: `${toHall.label} 入口`,
      });
    }

    addEdge({
      from: fromEntranceId,
      to: toEntranceId,
      weight: conn.weight,
      type: 'hall_connection',
      bidirectional: true,
    });
  }

  return { nodes, edges, adjacencyList };
}

// ─────────────────────────────────────────────
// ダイクストラ法
// ─────────────────────────────────────────────

/**
 * 2点間の最短経路を探索する（標準ダイクストラ）
 */
export function findShortestPath(
  graph: VenueGraph,
  startNodeId: string,
  endNodeId: string,
): PathResult | null {
  if (!graph.nodes.has(startNodeId) || !graph.nodes.has(endNodeId)) {
    return null;
  }

  if (startNodeId === endNodeId) {
    return { path: [startNodeId], totalCost: 0, segments: [] };
  }

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();

  // 優先度付きキュー（簡易実装）
  const queue: Array<{ nodeId: string; priority: number }> = [];

  // 初期化
  for (const nodeId of graph.nodes.keys()) {
    dist.set(nodeId, Infinity);
    prev.set(nodeId, null);
  }
  dist.set(startNodeId, 0);
  queue.push({ nodeId: startNodeId, priority: 0 });

  while (queue.length > 0) {
    // 最小コストのノードを取り出す
    queue.sort((a, b) => a.priority - b.priority);
    const current = queue.shift()!;

    if (visited.has(current.nodeId)) continue;
    visited.add(current.nodeId);

    if (current.nodeId === endNodeId) break;

    const neighbors = graph.adjacencyList.get(current.nodeId) ?? [];
    for (const { nodeId: neighborId, weight } of neighbors) {
      if (visited.has(neighborId)) continue;

      const newDist = dist.get(current.nodeId)! + weight;
      if (newDist < dist.get(neighborId)!) {
        dist.set(neighborId, newDist);
        prev.set(neighborId, current.nodeId);
        queue.push({ nodeId: neighborId, priority: newDist });
      }
    }
  }

  // 経路を復元
  if (dist.get(endNodeId) === Infinity) {
    return null; // 到達不可能
  }

  const path: string[] = [];
  let current: string | null = endNodeId;
  while (current !== null) {
    path.unshift(current);
    current = prev.get(current) ?? null;
  }

  // セグメントを生成
  const segments: PathSegment[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const fromNode = graph.nodes.get(path[i])!;
    const toNode = graph.nodes.get(path[i + 1])!;
    const edgeCost = findEdgeCost(graph, path[i], path[i + 1]);

    segments.push({
      from: fromNode,
      to: toNode,
      cost: edgeCost,
      instruction: generateInstruction(fromNode, toNode),
    });
  }

  return {
    path,
    totalCost: dist.get(endNodeId)!,
    segments,
  };
}

// ─────────────────────────────────────────────
// 巡回ルート最適化（貪欲法 Nearest Neighbor）
// ─────────────────────────────────────────────

/**
 * 複数サークルの巡回順を最適化する
 * Nearest Neighbor法を使用して、おおよその最短巡回順を算出する
 *
 * @param graph - 会場グラフ
 * @param startNodeId - 開始ノードID
 * @param targetNodeIds - 訪問対象のノードID一覧
 * @returns 最適化された巡回経路（各区間の PathResult の配列）
 */
export function findOptimalRoute(
  graph: VenueGraph,
  startNodeId: string,
  targetNodeIds: string[],
): PathResult[] {
  if (targetNodeIds.length === 0) return [];

  const remaining = new Set(targetNodeIds);
  const results: PathResult[] = [];
  let current = startNodeId;

  while (remaining.size > 0) {
    let bestTarget: string | null = null;
    let bestPath: PathResult | null = null;
    let bestCost = Infinity;

    // 最も近い未訪問ノードを探す
    for (const target of remaining) {
      const path = findShortestPath(graph, current, target);
      if (path && path.totalCost < bestCost) {
        bestCost = path.totalCost;
        bestPath = path;
        bestTarget = target;
      }
    }

    if (bestTarget && bestPath) {
      results.push(bestPath);
      remaining.delete(bestTarget);
      current = bestTarget;
    } else {
      // 到達不可能なノードはスキップ
      break;
    }
  }

  return results;
}

// ─────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────

/**
 * サークルスペースのアドレスからノードIDへ変換する
 *
 * @param hallId - ホールID (例: "east1")
 * @param blockName - ブロック名 (例: "A", "あ")
 * @returns ノードID
 */
export function blockToNodeId(hallId: string, blockName: string): string {
  return `${hallId}_${blockName}`;
}

/**
 * サークルスペースの完全アドレスからノードIDを生成
 * ブロック単位のノードIDにマッピングする（現在はブロック単位の粒度）
 *
 * @param hallLabel - ホールラベル (例: "東1")
 * @param blockName - ブロック名 (例: "A")
 * @param _number - スペース番号 (例: "01a") — 現在は未使用（ブロック単位）
 * @returns ノードID
 */
export function spaceToNodeId(hallLabel: string, blockName: string, _number?: string): string {
  const hallId = hallLabelToId(hallLabel);
  return blockToNodeId(hallId, blockName);
}

/**
 * ホールラベル（日本語表記）からホールIDに変換
 */
export function hallLabelToId(label: string): string {
  const areaMap: Record<string, string> = {
    '東': 'east', '西': 'west', '南': 'south',
  };

  const match = label.match(/^(東|西|南)(\d+)$/);
  if (!match) return label.toLowerCase();

  const area = areaMap[match[1]] ?? match[1];
  return `${area}${match[2]}`;
}

/**
 * ホールIDからホールラベル（日本語表記）に変換
 */
export function hallIdToLabel(hallId: string): string {
  const areaMap: Record<string, string> = {
    'east': '東', 'west': '西', 'south': '南',
  };

  const match = hallId.match(/^(east|west|south)(\d+)$/);
  if (!match) return hallId;

  const area = areaMap[match[1]] ?? match[1];
  return `${area}${match[2]}`;
}

// ─────────────────────────────────────────────
// 内部ヘルパー
// ─────────────────────────────────────────────

/** ユークリッド距離 */
function euclideanDistance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** ブロック座標をホール bounds に基づいて絶対座標に変換 */
function toAbsolutePosition(
  relativePos: Point,
  bounds: { x: number; y: number; width: number; height: number },
): Point {
  return {
    x: bounds.x + (relativePos.x / 100) * bounds.width,
    y: bounds.y + (relativePos.y / 100) * bounds.height,
  };
}

/** ホール内の通路ノードを生成 */
function generateAisleNodes(hall: Hall): MapNode[] {
  const nodes: MapNode[] = [];

  // ホール中央の主通路
  const centerAisle: MapNode = {
    id: `${hall.id}_aisle_center`,
    type: 'aisle',
    hallId: hall.id,
    position: {
      x: hall.bounds.x + hall.bounds.width / 2,
      y: hall.bounds.y + hall.bounds.height / 2,
    },
    label: `${hall.label} 中央通路`,
  };
  nodes.push(centerAisle);

  // ホール前方の通路
  const frontAisle: MapNode = {
    id: `${hall.id}_aisle_front`,
    type: 'aisle',
    hallId: hall.id,
    position: {
      x: hall.bounds.x + hall.bounds.width / 2,
      y: hall.bounds.y + hall.bounds.height * 0.2,
    },
    label: `${hall.label} 前方通路`,
  };
  nodes.push(frontAisle);

  // ホール後方の通路
  const backAisle: MapNode = {
    id: `${hall.id}_aisle_back`,
    type: 'aisle',
    hallId: hall.id,
    position: {
      x: hall.bounds.x + hall.bounds.width / 2,
      y: hall.bounds.y + hall.bounds.height * 0.8,
    },
    label: `${hall.label} 後方通路`,
  };
  nodes.push(backAisle);

  return nodes;
}

/** グラフ上の2ノード間のエッジコストを取得 */
function findEdgeCost(graph: VenueGraph, from: string, to: string): number {
  const neighbors = graph.adjacencyList.get(from) ?? [];
  const edge = neighbors.find(n => n.nodeId === to);
  return edge?.weight ?? 0;
}

/** 案内テキストを生成 */
function generateInstruction(from: MapNode, to: MapNode): string {
  if (from.hallId !== to.hallId) {
    return `${from.label ?? from.id} → ${to.label ?? to.id}（ホール間移動）`;
  }
  if (to.type === 'aisle') {
    return `${to.label ?? '通路'}を経由`;
  }
  return `${from.label ?? from.id} → ${to.label ?? to.id}`;
}
