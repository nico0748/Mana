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
 * Build a venue graph of nodes, edges, and adjacency lists from hall and connection definitions.
 *
 * @param halls - Hall definitions; each hall's bounds and blocks are used to create entrance, space, and aisle nodes.
 * @param connections - Hall connection definitions used to add weighted edges between hall entrances.
 * @returns The constructed VenueGraph containing `nodes`, `edges`, and `adjacencyList`.
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
 * Compute the shortest path between two nodes in the venue graph using Dijkstra's algorithm.
 *
 * If either `startNodeId` or `endNodeId` is not present in `graph`, or if `endNodeId` is unreachable from
 * `startNodeId`, the function returns `null`. When `startNodeId` equals `endNodeId`, a single-node path with
 * total cost `0` is returned.
 *
 * @param graph - The venue graph containing nodes, edges, and adjacency information to search
 * @param startNodeId - The node ID to start the search from
 * @param endNodeId - The node ID to reach
 * @returns A `PathResult` containing the ordered `path` of node IDs, `totalCost`, and `segments` with per-segment
 * instructions and costs; `null` if endpoints are missing or the destination cannot be reached
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
 * Approximate an optimal visiting order for multiple target nodes using the Nearest Neighbor heuristic.
 *
 * Repeatedly selects the nearest unvisited target from the current node (by computing shortest paths) and appends each resulting PathResult in visitation order; iteration stops when no remaining targets are reachable.
 *
 * @param graph - The venue graph to search
 * @param startNodeId - Node ID to start from
 * @param targetNodeIds - List of target node IDs to visit
 * @returns An array of PathResult objects representing each sequential shortest path between stops in the chosen visitation order; returns an empty array if `targetNodeIds` is empty or no targets are reachable
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
 * Convert a hall ID and block name into a node identifier used in the venue graph.
 *
 * @param hallId - Hall identifier (e.g., "east1")
 * @param blockName - Block name within the hall (e.g., "A", "あ")
 * @returns The node ID in the form `<hallId>_<blockName>`
 */
export function blockToNodeId(hallId: string, blockName: string): string {
  return `${hallId}_${blockName}`;
}

/**
 * Convert a full circle-space address into the corresponding node ID at block granularity.
 *
 * @param hallLabel - Hall label (e.g., "東1"); converted to internal hall ID before forming the node ID
 * @param blockName - Block name within the hall (e.g., "A")
 * @param _number - Optional space number (e.g., "01a"); ignored because node IDs are generated per block
 * @returns The node ID representing the specified block within the hall
 */
export function spaceToNodeId(hallLabel: string, blockName: string, _number?: string): string {
  const hallId = hallLabelToId(hallLabel);
  return blockToNodeId(hallId, blockName);
}

/**
 * Convert a Japanese hall label into its canonical hall ID.
 *
 * @param label - Japanese label such as `東1`, `西2`, or `南3`; other strings are allowed
 * @returns The mapped hall ID (e.g., `east1`, `west2`, `south3`) or `label.toLowerCase()` when the label does not match the expected pattern
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
 * Convert a hall identifier to its Japanese label.
 *
 * @param hallId - Hall identifier, typically in the form `east|west|south` followed by a number (e.g. `east1`)
 * @returns The Japanese label (e.g. `東1`, `西2`, `南3`) when the identifier matches the expected pattern; otherwise returns `hallId` unchanged
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

/**
 * Compute the Euclidean distance between two points.
 *
 * @param a - First point with `x` and `y` coordinates
 * @param b - Second point with `x` and `y` coordinates
 * @returns The straight-line distance between `a` and `b`
 */
function euclideanDistance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Convert a point expressed as percent-relative coordinates into absolute coordinates inside the given bounds.
 *
 * @param relativePos - Position with `x` and `y` expressed as percentages (0–100)
 * @param bounds - Rectangle describing the area's origin (`x`,`y`) and size (`width`,`height`)
 * @returns A point with absolute `x` and `y` coordinates in the same coordinate space as `bounds`
 */
function toAbsolutePosition(
  relativePos: Point,
  bounds: { x: number; y: number; width: number; height: number },
): Point {
  return {
    x: bounds.x + (relativePos.x / 100) * bounds.width,
    y: bounds.y + (relativePos.y / 100) * bounds.height,
  };
}

/**
 * Create three aisle nodes inside a hall: center, front, and back.
 *
 * @param hall - The hall whose bounds and label are used to position and label the nodes
 * @returns An array of three `MapNode` objects:
 *  - `${hall.id}_aisle_center`: centered within the hall
 *  - `${hall.id}_aisle_front`: positioned at 20% of the hall height from the top
 *  - `${hall.id}_aisle_back`: positioned at 80% of the hall height from the top
 * Each node has `type: 'aisle'`, `hallId`, `position`, and a human-readable `label`.
 */
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

/**
 * Retrieve the weight of the edge from one node to another in the venue graph.
 *
 * @param graph - The venue graph containing nodes and an adjacency list
 * @param from - Source node ID
 * @param to - Destination node ID
 * @returns The edge weight from `from` to `to` if present, `0` otherwise
 */
function findEdgeCost(graph: VenueGraph, from: string, to: string): number {
  const neighbors = graph.adjacencyList.get(from) ?? [];
  const edge = neighbors.find(n => n.nodeId === to);
  return edge?.weight ?? 0;
}

/**
 * Create a concise, human-readable navigation instruction from one map node to another.
 *
 * @param from - The origin map node
 * @param to - The destination map node
 * @returns A short instruction string (e.g. "A → B", "A → B（ホール間移動）", or "通路を経由" when the destination is an aisle)
 */
function generateInstruction(from: MapNode, to: MapNode): string {
  if (from.hallId !== to.hallId) {
    return `${from.label ?? from.id} → ${to.label ?? to.id}（ホール間移動）`;
  }
  if (to.type === 'aisle') {
    return `${to.label ?? '通路'}を経由`;
  }
  return `${from.label ?? from.id} → ${to.label ?? to.id}`;
}
