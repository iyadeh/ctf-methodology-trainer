import { detectCycles } from "../attack-graph/traversal";
import type { AttackNodePhase } from "../attack-graph/types";
import { GenerationVerificationError } from "./errors";
import { graphVerificationSchema } from "./schema";
import type {
  GraphVerification,
  GraphVerificationStatus,
  VerificationCheckResult,
  VerifyGraphParams,
} from "./types";

const PHASE_RANKS: Record<AttackNodePhase, number> = {
  reconnaissance: 1,
  threat_modeling: 2,
  vulnerability_analysis: 3,
  exploitation: 4,
  post_exploitation: 5,
  reporting: 6,
};

/**
 * Deterministically checks if any terminal node can be reached from at least one entry node via BFS.
 */
function isTerminalReachable(
  entryNodeIds: readonly string[],
  terminalNodeIds: readonly string[],
  nodeIds: ReadonlySet<string>,
  adj: Map<string, string[]>,
): { reachable: boolean; reachableTerminalsCount: number } {
  if (entryNodeIds.length === 0 || terminalNodeIds.length === 0) {
    return { reachable: false, reachableTerminalsCount: 0 };
  }

  const terminalSet = new Set(terminalNodeIds);
  const visited = new Set<string>();
  const queue: string[] = [];

  for (const entryId of entryNodeIds) {
    if (nodeIds.has(entryId)) {
      visited.add(entryId);
      queue.push(entryId);
    }
  }

  let reachedCount = 0;
  const reachedTerminals = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (terminalSet.has(current) && !reachedTerminals.has(current)) {
      reachedTerminals.add(current);
      reachedCount++;
    }

    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor) && nodeIds.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return {
    reachable: reachedCount > 0,
    reachableTerminalsCount: reachedCount,
  };
}

/**
 * Verifies an attack graph against structural integrity rules, PTES methodology constraints,
 * and extracted machine facts.
 */
export function verifyAttackGraph(params: VerifyGraphParams): GraphVerification {
  const { graph, facts } = params;
  const checks: VerificationCheckResult[] = [];
  const missingSteps: string[] = [];
  const unsupportedSteps: string[] = [];
  const conflicts: string[] = [];

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const nodeIds = new Set(graph.nodes.map((n) => n.id));

  // Build adjacency list and in-degree maps
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();

  for (const node of graph.nodes) {
    adj.set(node.id, []);
    inDegree.set(node.id, 0);
    outDegree.set(node.id, 0);
  }

  for (const edge of graph.edges) {
    if (nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId)) {
      adj.get(edge.sourceNodeId)?.push(edge.targetNodeId);
      inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) || 0) + 1);
      outDegree.set(edge.sourceNodeId, (outDegree.get(edge.sourceNodeId) || 0) + 1);
    }
  }

  let penalty = 0;

  // 1. Acyclicity Check
  const hasCycles = detectCycles(graph.nodes, graph.edges);
  const acyclicIssues: string[] = [];
  if (hasCycles) {
    acyclicIssues.push("Circular dependency detected in attack graph edges");
    conflicts.push("Circular dependency detected: Attack graph must be a directed acyclic graph (DAG)");
    penalty += 0.40;
  }
  checks.push({
    name: "acyclicity",
    passed: !hasCycles,
    score: hasCycles ? 0 : 1,
    description: "Graph must not contain circular dependencies or loops.",
    issues: acyclicIssues,
  });

  // 2. Entry Points Check
  const entryNodes = graph.nodes.filter(
    (n) => n.isEntryPoint || graph.entryNodeIds.includes(n.id),
  );
  const entryIssues: string[] = [];
  if (entryNodes.length === 0) {
    entryIssues.push("No entry points identified in the attack graph");
    missingSteps.push("Missing initial entry point or reconnaissance step");
    penalty += 0.30;
  } else {
    // Check if any entry point has a hard prerequisite (which would contradict being an entry point)
    for (const entry of entryNodes) {
      const incomingHardEdges = graph.edges.filter(
        (e) => e.targetNodeId === entry.id && e.dependencyType === "hard",
      );
      if (incomingHardEdges.length > 0) {
        entryIssues.push(
          `Entry point '${entry.title}' has incoming hard dependency from '${incomingHardEdges[0].sourceNodeId}'`,
        );
        conflicts.push(`Entry point '${entry.title}' cannot have hard prerequisites`);
        penalty += 0.10;
      }
    }
  }
  checks.push({
    name: "entry_points",
    passed: entryIssues.length === 0,
    score: entryNodes.length === 0 ? 0 : Math.max(0, 1 - entryIssues.length * 0.2),
    description: "Attack graph must have at least one valid entry point without hard prerequisites.",
    issues: entryIssues,
  });

  // 3. Terminal Objectives Check
  const terminalNodes = graph.nodes.filter(
    (n) => n.isTerminal || graph.terminalNodeIds.includes(n.id),
  );
  const terminalIssues: string[] = [];
  if (terminalNodes.length === 0) {
    terminalIssues.push("No terminal objectives (e.g. flags or system compromise) defined");
    missingSteps.push("Missing terminal objective (user/root flag or goal)");
    penalty += 0.25;
  }
  checks.push({
    name: "terminal_objectives",
    passed: terminalNodes.length > 0,
    score: terminalNodes.length > 0 ? 1 : 0,
    description: "Attack graph must specify terminal objective capture nodes.",
    issues: terminalIssues,
  });

  // 4. Reachability Check
  const reachabilityIssues: string[] = [];
  let isReachable = false;
  if (entryNodes.length > 0 && terminalNodes.length > 0) {
    const { reachable, reachableTerminalsCount } = isTerminalReachable(
      entryNodes.map((n) => n.id),
      terminalNodes.map((n) => n.id),
      nodeIds,
      adj,
    );
    isReachable = reachable;
    if (!reachable) {
      reachabilityIssues.push("No terminal objectives are reachable from any entry point");
      conflicts.push("Disconnected attack path: terminal objectives cannot be reached from entry points");
      missingSteps.push("Missing intermediate exploitation path connecting reconnaissance to objective capture");
      penalty += 0.35;
    } else if (reachableTerminalsCount < terminalNodes.length) {
      reachabilityIssues.push(
        `Only ${reachableTerminalsCount} of ${terminalNodes.length} terminal objectives are reachable`,
      );
      penalty += 0.05;
    }
  } else {
    reachabilityIssues.push("Cannot evaluate reachability due to missing entry or terminal nodes");
  }
  checks.push({
    name: "reachability",
    passed: isReachable,
    score: isReachable ? 1 : 0,
    description: "Terminal objectives must be reachable from at least one entry point via directed attack path.",
    issues: reachabilityIssues,
  });

  // 5. Phase Ordering Check
  const orderingIssues: string[] = [];
  for (const edge of graph.edges) {
    const sourceNode = nodeMap.get(edge.sourceNodeId);
    const targetNode = nodeMap.get(edge.targetNodeId);
    if (sourceNode && targetNode && edge.dependencyType === "hard") {
      const sourceRank = PHASE_RANKS[sourceNode.phase] || 0;
      const targetRank = PHASE_RANKS[targetNode.phase] || 0;
      // Inverted hard dependency across phases: e.g. post_exploitation (5) -> reconnaissance (1)
      if (sourceRank > targetRank) {
        orderingIssues.push(
          `Inverted dependency: '${sourceNode.title}' (${sourceNode.phase}) is a hard prerequisite for '${targetNode.title}' (${targetNode.phase})`,
        );
        conflicts.push(
          `Inverted phase ordering: ${sourceNode.phase} cannot be a hard requirement for earlier phase ${targetNode.phase}`,
        );
        penalty += 0.15;
      }
    }
  }
  checks.push({
    name: "phase_ordering",
    passed: orderingIssues.length === 0,
    score: orderingIssues.length === 0 ? 1 : Math.max(0, 1 - orderingIssues.length * 0.25),
    description: "Hard dependencies must respect logical PTES methodology progression.",
    issues: orderingIssues,
  });

  // 6. Critical Milestones Progression
  const milestoneIssues: string[] = [];
  const hasPostExploitation = graph.nodes.some(
    (n) => n.phase === "post_exploitation" || n.kind === "objective_capture",
  );
  const hasInitialAccess = graph.nodes.some(
    (n) => n.kind === "initial_access" || n.phase === "exploitation",
  );

  if (hasPostExploitation && !hasInitialAccess) {
    milestoneIssues.push("Post-exploitation nodes exist but no initial access / exploitation node is defined");
    missingSteps.push("Missing initial access / exploitation step before post-exploitation");
    conflicts.push("Graph reaches post-exploitation without establishing initial access");
    penalty += 0.20;
  }

  // Check root privilege escalation milestone
  const hasRootObjective = graph.nodes.some(
    (n) =>
      n.title.toLowerCase().includes("root") ||
      n.description.toLowerCase().includes("root") ||
      n.metadata?.location?.toLowerCase().includes("root"),
  );
  const hasPrivEsc = graph.nodes.some(
    (n) => n.kind === "privilege_escalation",
  );

  if (hasRootObjective && !hasPrivEsc && graph.nodes.length > 3) {
    milestoneIssues.push("Root objective exists but no privilege escalation node is modeled");
    missingSteps.push("Missing privilege escalation milestone to reach root objective");
    penalty += 0.15;
  }

  checks.push({
    name: "critical_milestones",
    passed: milestoneIssues.length === 0,
    score: milestoneIssues.length === 0 ? 1 : Math.max(0, 1 - milestoneIssues.length * 0.3),
    description: "Graph must include critical attack chain milestones (initial access and privilege escalation).",
    issues: milestoneIssues,
  });

  // 7. Fact Alignment Check
  const factIssues: string[] = [];
  if (facts) {
    // Check if network services are reflected in discovery nodes
    const servicesList = facts.services || [];
    for (const portInfo of servicesList) {
      const portFound = graph.nodes.some(
        (n) =>
          n.metadata?.port === portInfo.port ||
          n.title.includes(String(portInfo.port)) ||
          (portInfo.service && n.title.toLowerCase().includes(portInfo.service.toLowerCase())),
      );
      if (!portFound) {
        factIssues.push(`Service ${portInfo.port}/${portInfo.protocol} (${portInfo.service || "unknown"}) has no discovery node`);
      }
    }

    // Check if objectives in facts are represented
    for (const obj of facts.objectives) {
      const objFound = graph.nodes.some(
        (n) =>
          n.title.toLowerCase().includes(obj.name.toLowerCase()) ||
          n.description.toLowerCase().includes(obj.name.toLowerCase()) ||
          (obj.location && n.metadata?.location?.toLowerCase().includes(obj.location.toLowerCase())),
      );
      if (!objFound) {
        factIssues.push(`Objective '${obj.name}' is not represented in graph nodes`);
      }
    }

    if (factIssues.length > 0) {
      penalty += Math.min(0.20, factIssues.length * 0.05);
    }
  }
  checks.push({
    name: "fact_alignment",
    passed: factIssues.length === 0,
    score: factIssues.length === 0 ? 1 : Math.max(0, 1 - factIssues.length * 0.1),
    description: "Attack graph elements must align with verified machine facts.",
    issues: factIssues,
  });

  // 8. Orphan Nodes Check
  const orphanIssues: string[] = [];
  if (graph.nodes.length > 1) {
    for (const node of graph.nodes) {
      const inDeg = inDegree.get(node.id) || 0;
      const outDeg = outDegree.get(node.id) || 0;
      if (inDeg === 0 && outDeg === 0 && !node.isEntryPoint && !node.isTerminal) {
        orphanIssues.push(`Orphan node '${node.title}' (${node.id}) has no connections`);
        unsupportedSteps.push(`Orphan node without dependency context: ${node.title}`);
      }
    }
    if (orphanIssues.length > 0) {
      penalty += Math.min(0.15, orphanIssues.length * 0.05);
    }
  }
  checks.push({
    name: "orphan_nodes",
    passed: orphanIssues.length === 0,
    score: orphanIssues.length === 0 ? 1 : Math.max(0, 1 - orphanIssues.length * 0.1),
    description: "All intermediate nodes should be connected into the attack graph topology.",
    issues: orphanIssues,
  });

  // Compute final confidence score (0.00 - 1.00)
  const rawConfidence = Math.max(0, Math.min(1, 1 - penalty));
  const confidence = Math.round(rawConfidence * 100) / 100;

  // Determine status
  let status: GraphVerificationStatus = "validated";

  const isFatal =
    hasCycles ||
    entryNodes.length === 0 ||
    terminalNodes.length === 0 ||
    !isReachable ||
    (hasPostExploitation && !hasInitialAccess) ||
    confidence < 0.60;

  if (isFatal) {
    status = "failed";
  } else if (
    confidence < 0.85 ||
    missingSteps.length > 0 ||
    conflicts.length > 0 ||
    unsupportedSteps.length > 0
  ) {
    status = "low_confidence";
  }

  const result: GraphVerification = {
    status,
    confidence,
    missingSteps,
    unsupportedSteps,
    conflicts,
    checks,
    verifiedAt: new Date().toISOString(),
  };

  // Validate output against Zod schema to enforce strict contract
  return graphVerificationSchema.parse(result);
}

/**
 * Asserts that a graph verification passed with acceptable quality.
 * Throws GenerationVerificationError if the status is "failed".
 */
export function assertGraphVerification(verification: GraphVerification): void {
  if (verification.status === "failed") {
    const reasons = [
      ...verification.conflicts,
      ...verification.missingSteps,
      ...verification.unsupportedSteps,
    ];
    const detail = reasons.length > 0 ? reasons.join("; ") : "Unknown structural defect";
    throw new GenerationVerificationError(
      `Attack graph verification failed (confidence: ${verification.confidence}): ${detail}`,
      verification,
    );
  }
}
