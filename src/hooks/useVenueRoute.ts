import { useMemo } from 'react';
import type { Circle } from '../types';
import type { VenueGraph } from '../types/pathfinding';
import { buildVenueGraph, findOptimalRoute, spaceToNodeId } from '../lib/dijkstra';
import { getVenueLayout } from '../data/tokyoBigSight';
import { db } from '../lib/db';

export const EVENT_KEY = 'kuramori_event_code';

/**
 * Map a circle to its venue graph node id.
 *
 * @param circle - Circle object; its `hall`, `block`, and `number` are used to build the node id
 * @returns The node id corresponding to the circle's `hall`/`block`/`number`, or `null` if required fields are missing or conversion fails
 */
export function circleToNodeId(circle: Circle): string | null {
  if (!circle.hall || !circle.block) return null;
  try {
    return spaceToNodeId(circle.hall, circle.block, circle.number);
  } catch {
    return null;
  }
}

/**
 * Return the venue graph corresponding to the provided event code.
 *
 * @param eventCode - The event identifier used to look up the venue layout
 * @returns The `VenueGraph` built from the event's layout, or `null` if `eventCode` is falsy or no layout exists
 */
export function useVenueGraph(eventCode: string): VenueGraph | null {
  return useMemo(() => {
    if (!eventCode) return null;
    const layout = getVenueLayout(eventCode);
    if (!layout) return null;
    return buildVenueGraph(layout.halls, layout.connections);
  }, [eventCode]);
}

export interface OptimalRouteResult {
  orderedCircleGroups: Circle[][];
  totalCost: number;
}

/**
 * Compute an optimal visiting order for the given circles on a venue graph.
 *
 * Maps input circles to graph nodes, treats the first mapped node as the start and the remaining mapped nodes as targets, and computes an ordered grouping of circles by the resulting route along with the aggregated travel cost.
 *
 * @param graph - The venue graph used to compute routes between nodes.
 * @param circles - Circles to include in the route; circles that cannot be mapped to graph nodes are ignored.
 * @returns An object containing `orderedCircleGroups` (circles grouped in route order) and `totalCost` (sum of segment costs), or `null` if no circles were mapped or the input list is empty.
 */
export function computeOptimalRoute(
  graph: VenueGraph,
  circles: Circle[],
): OptimalRouteResult | null {
  if (circles.length === 0) return null;

  const nodeToCircles = new Map<string, Circle[]>();
  const seenNodeIds: string[] = [];

  for (const circle of circles) {
    const nodeId = circleToNodeId(circle);
    if (nodeId && graph.nodes.has(nodeId)) {
      if (!nodeToCircles.has(nodeId)) {
        nodeToCircles.set(nodeId, []);
        seenNodeIds.push(nodeId);
      }
      nodeToCircles.get(nodeId)!.push(circle);
    }
  }

  if (seenNodeIds.length === 0) return null;

  const startNodeId = seenNodeIds[0];
  const targetNodeIds = seenNodeIds.slice(1);

  const pathResults = findOptimalRoute(graph, startNodeId, targetNodeIds);
  const orderedNodeIds = [startNodeId, ...pathResults.map(r => r.path[r.path.length - 1])];
  const totalCost = pathResults.reduce((sum, r) => sum + r.totalCost, 0);

  const orderedCircleGroups = orderedNodeIds
    .map(nodeId => nodeToCircles.get(nodeId) ?? [])
    .filter(g => g.length > 0);

  return { orderedCircleGroups, totalCost };
}

/**
 * Reorders circles to follow an optimal path on the venue graph and persists the new ordering.
 *
 * Updates each circle's `order` and `updatedAt` in the database. Circles that cannot be mapped
 * to nodes in the graph are appended after the graph-based order.
 *
 * @returns The count of circles placed according to the graph-based ordering; circles appended
 *          because they were not present on the graph are not counted.
 */
export async function applyOptimalRoute(
  graph: VenueGraph,
  circles: Circle[],
): Promise<number> {
  const result = computeOptimalRoute(graph, circles);
  if (!result) return 0;

  const reordered = result.orderedCircleGroups.flat();
  const notInGraph = circles.filter(c => !reordered.find(r => r.id === c.id));
  const finalOrder = [...reordered, ...notInGraph];
  const now = Date.now();
  await Promise.all(finalOrder.map((circle, idx) =>
    db.circles.update(circle.id, { order: idx + 1, updatedAt: now })
  ));
  return reordered.length;
}
