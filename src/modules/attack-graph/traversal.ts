import type { AttackEdge, AttackNode } from "./types";

/**
 * Detects whether the graph contains a cycle using DFS cycle detection.
 * Returns true if a cycle exists (invalid for an attack graph), false otherwise.
 */
export function detectCycles(
  nodes: readonly AttackNode[],
  edges: readonly AttackEdge[],
): boolean {
  const adj = new Map<string, string[]>();
  for (const node of nodes) {
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    const list = adj.get(edge.sourceNodeId);
    if (list) {
      list.push(edge.targetNodeId);
    }
  }

  // 0 = unvisited (white), 1 = visiting (grey), 2 = visited (black)
  const state = new Map<string, number>();
  for (const node of nodes) {
    state.set(node.id, 0);
  }

  function hasCycleDFS(nodeId: string): boolean {
    state.set(nodeId, 1);

    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      const neighborState = state.get(neighbor);
      if (neighborState === 1) {
        // Back-edge found -> cycle!
        return true;
      }
      if (neighborState === 0) {
        if (hasCycleDFS(neighbor)) {
          return true;
        }
      }
    }

    state.set(nodeId, 2);
    return false;
  }

  for (const node of nodes) {
    if (state.get(node.id) === 0) {
      if (hasCycleDFS(node.id)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Computes a topological sort of the graph nodes.
 * Returns an array of node IDs in valid topological order.
 */
export function topologicalSort(
  nodes: readonly AttackNode[],
  edges: readonly AttackEdge[],
): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    if (adj.has(edge.sourceNodeId) && inDegree.has(edge.targetNodeId)) {
      adj.get(edge.sourceNodeId)!.push(edge.targetNodeId);
      inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  return result;
}

/**
 * Checks whether a target node's hard prerequisites are satisfied.
 */
export function isNodeUnlocked(
  targetNodeId: string,
  edges: readonly AttackEdge[],
  satisfiedNodeIds: ReadonlySet<string>,
): boolean {
  const hardPrerequisites = edges
    .filter(
      (edge) =>
        edge.targetNodeId === targetNodeId && edge.dependencyType === "hard",
    )
    .map((edge) => edge.sourceNodeId);

  // If node has no hard prerequisites, it is unlocked by default
  if (hardPrerequisites.length === 0) {
    return true;
  }

  // All hard prerequisites must be satisfied
  return hardPrerequisites.every((prereqId) => satisfiedNodeIds.has(prereqId));
}

/**
 * Finds a canonical reference path from an entry point to a terminal node using BFS.
 */
export function findReferencePath(
  nodes: readonly AttackNode[],
  edges: readonly AttackEdge[],
  entryNodeIds: readonly string[],
  terminalNodeIds: readonly string[],
): string[] {
  if (entryNodeIds.length === 0 || terminalNodeIds.length === 0) {
    return nodes.map((n) => n.id);
  }

  const terminalSet = new Set(terminalNodeIds);
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    adj.get(edge.sourceNodeId)?.push(edge.targetNodeId);
  }

  // Queue holds: [currentNodeId, pathSoFar]
  const queue: Array<{ id: string; path: string[] }> = entryNodeIds.map(
    (id) => ({
      id,
      path: [id],
    }),
  );

  const visited = new Set<string>(entryNodeIds);

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;

    if (terminalSet.has(id)) {
      return path;
    }

    const neighbors = adj.get(id) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({
          id: neighbor,
          path: [...path, neighbor],
        });
      }
    }
  }

  // If BFS didn't connect, fallback to topological sort order
  return topologicalSort(nodes, edges);
}
