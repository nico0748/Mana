import { useMemo } from 'react';
import type { Circle } from '../types';
import type { VenueGraph } from '../types/pathfinding';
import { buildVenueGraph, findOptimalRoute, spaceToNodeId } from '../lib/dijkstra';
import { getVenueLayout } from '../data/tokyoBigSight';
import { circlesApi } from '../lib/api';

export const EVENT_KEY = 'kuramori_event_code';

/**
 * Map a circle's hall, block, and number to the corresponding venue graph node ID.
 *
 * @param circle - The circle whose `hall`, `block`, and `number` identify a space
 * @returns The node ID for the circle's space, or `null` if required fields are missing or conversion fails
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
 * Create a VenueGraph for the specified event code.
 *
 * @param eventCode - Event identifier used to load the venue layout
 * @returns The constructed `VenueGraph` for `eventCode`, or `null` if `eventCode` is falsy or no layout is available
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
 * Compute an ordered grouping of circles according to an optimal route through the venue graph.
 *
 * Builds groups of circles that share the same graph node, determines a start node from the
 * first seen circle, finds an optimal route visiting the remaining distinct node IDs, and
 * returns the circles grouped in the visiting order along with the summed route cost.
 *
 * @param graph - The venue graph used to compute routes.
 * @param circles - The list of circles to consider; circles that do not map to a node in `graph` are ignored.
 * @returns An object with `orderedCircleGroups` (arrays of circles in visit order) and `totalCost` (sum of route segment costs), or `null` if no route can be computed (when `circles` is empty or none map to graph nodes).
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
 * Apply the computed optimal ordering for the given circles and persist the new order.
 *
 * Computes an optimal route for `circles` on `graph`, updates each circle's `order` and `updatedAt` (persisted via the circles API), places circles not present in the graph after the reordered ones, and returns the count of circles that were part of the reordered (graph-included) portion.
 *
 * @param graph - The venue graph used to compute the route
 * @param circles - The list of circles to reorder
 * @returns The number of circles that were included in and reordered according to the computed route
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
    circlesApi.update(circle.id, { order: idx + 1, updatedAt: now })
  ));
  return reordered.length;
}
