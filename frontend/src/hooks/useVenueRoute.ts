import { useMemo } from 'react';
import type { Circle } from '../types';
import type { VenueGraph } from '../types/pathfinding';
import { buildVenueGraph, findOptimalRoute, spaceToNodeId } from '../lib/dijkstra';
import { getVenueLayout } from '../data/tokyoBigSight';
import { circlesApi } from '../lib/api';

export const EVENT_KEY = 'doujin_pp_event_code';

export function circleToNodeId(circle: Circle): string | null {
  if (!circle.hall || !circle.block) return null;
  try {
    return spaceToNodeId(circle.hall, circle.block, circle.number);
  } catch {
    return null;
  }
}

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
