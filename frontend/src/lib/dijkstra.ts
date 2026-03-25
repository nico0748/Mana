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
 * Build a venue graph from hall definitions and inter-hall connections.
 *
 * Produces a graph composed of nodes (entrances, spaces, aisle points) and weighted edges (walkways, aisles, hall connections),
 * and an adjacency list mapping each node id to its neighboring node ids and edge weights.
 *
 * @param halls - Array of hall definitions (including blocks, bounds, labels) used to generate entrance, space, and aisle nodes
 * @param connections - Array of hall connection records (including source/destination ids, positions, and weight) used to create inter-hall edges
 * @returns The constructed venue graph with `nodes`, `edges`, and `adjacencyList`
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
 * Returns `null` when either node ID is not present in the graph or when the destination is unreachable.
 *
 * @returns A `PathResult` containing the ordered `path` of node IDs, the numeric `totalCost`, and an array of `segments` (each with `from`, `to`, `cost`, and `instruction`), or `null` if no path exists.
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
 * Approximates a visiting order for multiple targets using the Nearest Neighbor heuristic.
 *
 * Finds, from `startNodeId`, a greedy sequence of next targets by repeatedly choosing the reachable
 * unvisited target with the lowest shortest-path cost and collecting each inter-target shortest path.
 * If `targetNodeIds` is empty the function returns an empty array. If some targets become unreachable,
 * the search stops and the routes found so far are returned.
 *
 * @param graph - The venue graph to route on
 * @param startNodeId - Node ID where the tour starts
 * @param targetNodeIds - List of node IDs to visit
 * @returns An array of `PathResult` objects; each element is the shortest-path result for one leg of the tour in visitation order
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
 * Create the node ID for a block within a hall.
 *
 * @param hallId - Hall identifier (e.g., "east1")
 * @param blockName - Block label within the hall (e.g., "A", "あ")
 * @returns The node ID in the form `{hallId}_{blockName}`
 */
export function blockToNodeId(hallId: string, blockName: string): string {
  return `${hallId}_${blockName}`;
}

/**
 * Convert a space address to the corresponding block-level node ID.
 *
 * @param hallLabel - Hall label (e.g., "東1"); used to derive the hall ID
 * @param blockName - Block name within the hall (e.g., "A")
 * @param _number - Space number (e.g., "01a"); currently unused because mapping is at block granularity
 * @returns The node ID for the block (formatted as `${hallId}_${blockName}`)
 */
export function spaceToNodeId(hallLabel: string, blockName: string, _number?: string): string {
  const hallId = hallLabelToId(hallLabel);
  return blockToNodeId(hallId, blockName);
}

/**
 * Convert a Japanese hall label into a canonical hall identifier.
 *
 * Matches labels of the form `東N`, `西N`, or `南N` and returns `eastN`, `westN`, or `southN` respectively.
 *
 * @param label - Japanese hall label (e.g., `東1`, `西2`, `南3`)
 * @returns The canonical hall id (e.g., `east1`). If the label does not match the expected pattern, returns `label.toLowerCase()`.
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
 * Convert a hall ID into its Japanese label.
 *
 * @param hallId - Hall identifier, typically in the form `eastN`, `westN`, or `southN`
 * @returns The Japanese label (e.g., `東N`, `西N`, `南N`) when the input matches the expected pattern; otherwise returns the original `hallId`
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
 * Compute the Euclidean distance between two 2D points.
 *
 * @param a - The first point with `x` and `y` coordinates
 * @param b - The second point with `x` and `y` coordinates
 * @returns The straight-line distance between `a` and `b`
 */
function euclideanDistance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Convert a position expressed as percentages inside bounds to absolute coordinates.
 *
 * @param relativePos - Position with `x` and `y` as percentages (0–100) relative to `bounds`
 * @param bounds - Rectangle defining origin (`x`,`y`) and size (`width`,`height`) for conversion
 * @returns Absolute `Point` with `x` and `y` in the same coordinate space as `bounds`
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
 * Generate three aisle nodes (center, front, back) for a given hall.
 *
 * Each node is an `aisle`-type MapNode positioned horizontally at the hall's center
 * and vertically at 50% (center), 20% (front), and 80% (back) of the hall bounds.
 *
 * @param hall - Hall object whose bounds and label are used to compute node positions and labels
 * @returns An array of three MapNode objects with ids `${hall.id}_aisle_center`, `${hall.id}_aisle_front`, and `${hall.id}_aisle_back`
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
 * Get the weight of the direct edge from one node to another in the venue graph.
 *
 * @param graph - The venue graph containing nodes and an adjacency list
 * @param from - Source node ID
 * @param to - Destination node ID
 * @returns The edge weight from `from` to `to` if an edge exists, `0` otherwise
 */
function findEdgeCost(graph: VenueGraph, from: string, to: string): number {
  const neighbors = graph.adjacencyList.get(from) ?? [];
  const edge = neighbors.find(n => n.nodeId === to);
  return edge?.weight ?? 0;
}

/**
 * Generate a human-readable navigation instruction between two map nodes.
 *
 * The returned instruction uses node `label` when available, otherwise falls back to `id`.
 * - If the nodes belong to different halls, returns "`{from} → {to}（ホール間移動）`".
 * - If the destination node's type is `'aisle'` within the same hall, returns "`{to}を経由`".
 * - Otherwise returns "`{from} → {to}`".
 *
 * @param from - The origin map node
 * @param to - The destination map node
 * @returns The navigation instruction string
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
