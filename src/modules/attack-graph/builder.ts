import "server-only";

import type { ExtractedMachineFacts } from "../facts/types";
import { AttackGraphSchema } from "./schema";
import { detectCycles, findReferencePath } from "./traversal";
import type {
  AttackEdge,
  AttackGraph,
  AttackNode,
  AttackNodeKind,
  AttackNodePhase,
  SpoilerLevel,
} from "./types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Builds a deterministic, validated Attack Graph from extracted machine facts.
 * Hidden knowledge security boundary: This graph is strictly server-side.
 */
export function buildAttackGraphFromFacts(
  facts: ExtractedMachineFacts,
): AttackGraph {
  const nodes: AttackNode[] = [];
  const edges: AttackEdge[] = [];
  const entryNodeIds: string[] = [];
  const terminalNodeIds: string[] = [];

  let edgeCounter = 0;
  function addEdge(sourceId: string, targetId: string, description?: string) {
    if (sourceId === targetId) return;
    const exists = edges.some(
      (e) => e.sourceNodeId === sourceId && e.targetNodeId === targetId,
    );
    if (!exists) {
      edges.push({
        id: `edge-${++edgeCounter}`,
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        dependencyType: "hard",
        description,
      });
    }
  }

  // 1. Create Entry Points from Services
  const serviceNodeMap = new Map<string, string>(); // serviceKey -> nodeId
  for (const svc of facts.services) {
    const nodeId = `node-service-${svc.port}-${svc.protocol}`;
    const node: AttackNode = {
      id: nodeId,
      semanticKey: `service.${svc.service}.${svc.port}`,
      title: `Service Discovery: ${svc.service.toUpperCase()} (Port ${svc.port})`,
      description: `${svc.product || svc.service} ${svc.version || ""}`.trim(),
      phase: "reconnaissance",
      kind: "service_discovery",
      spoilerLevel: 1 as SpoilerLevel,
      isEntryPoint: true,
      isTerminal: false,
      metadata: {
        port: svc.port,
        protocol: svc.protocol,
        service: svc.service,
        provenance: svc.provenance,
      },
    };
    nodes.push(node);
    entryNodeIds.push(nodeId);
    serviceNodeMap.set(svc.service.toLowerCase(), nodeId);
    serviceNodeMap.set(`port-${svc.port}`, nodeId);
  }

  // If no services were defined, create a default reconnaissance entry node
  if (nodes.length === 0) {
    const entryId = "node-recon-entry";
    nodes.push({
      id: entryId,
      semanticKey: "recon.host-discovery",
      title: "Host & Service Enumeration",
      description: `Target machine discovery on ${facts.profile.name}`,
      phase: "reconnaissance",
      kind: "service_discovery",
      spoilerLevel: 0 as SpoilerLevel,
      isEntryPoint: true,
      isTerminal: false,
    });
    entryNodeIds.push(entryId);
  }

  // 2. Application Surfaces
  const surfaceNodeIds: string[] = [];
  for (let i = 0; i < facts.surfaces.length; i++) {
    const surf = facts.surfaces[i];
    const nodeId = `node-surface-${i + 1}-${slugify(surf.name)}`;
    const node: AttackNode = {
      id: nodeId,
      semanticKey: `surface.${surf.kind}.${slugify(surf.name)}`,
      title: `Application Surface: ${surf.name}`,
      description: surf.urlOrPath
        ? `Endpoint: ${surf.urlOrPath} (${surf.technologies.join(", ")})`
        : surf.name,
      phase: "threat_modeling",
      kind: "surface_discovery",
      spoilerLevel: 2 as SpoilerLevel,
      isEntryPoint: false,
      isTerminal: false,
      metadata: {
        provenance: surf.provenance,
      },
    };
    nodes.push(node);
    surfaceNodeIds.push(nodeId);

    // Connect from web/http service entry node if applicable
    const httpServiceNode =
      serviceNodeMap.get("http") ||
      serviceNodeMap.get("https") ||
      entryNodeIds[0];
    if (httpServiceNode) {
      addEdge(httpServiceNode, nodeId, "Discovered via web port");
    }
  }

  // 3. Vulnerabilities
  const vulnNodeIds: string[] = [];
  for (let i = 0; i < facts.vulnerabilities.length; i++) {
    const vuln = facts.vulnerabilities[i];
    const nodeId = `node-vuln-${i + 1}-${slugify(vuln.title)}`;
    const node: AttackNode = {
      id: nodeId,
      semanticKey: `vuln.${slugify(vuln.title)}`,
      title: `Vulnerability: ${vuln.title}`,
      description: vuln.description,
      phase: "vulnerability_analysis",
      kind: "vulnerability_identification",
      spoilerLevel: 3 as SpoilerLevel,
      isEntryPoint: false,
      isTerminal: false,
      metadata: {
        cve: vuln.cve,
        provenance: vuln.provenance,
      },
    };
    nodes.push(node);
    vulnNodeIds.push(nodeId);

    // Link from surfaces or services
    const sourceNodeId = surfaceNodeIds[0] || entryNodeIds[0];
    if (sourceNodeId) {
      addEdge(sourceNodeId, nodeId, "Identified on target surface");
    }
  }

  // 4. Discovered Findings & Credentials
  const credNodeIds: string[] = [];
  for (let i = 0; i < facts.findings.length; i++) {
    const finding = facts.findings[i];
    const isCred =
      finding.kind === "credential" ||
      finding.kind === "hash" ||
      finding.kind === "ssh_key";

    const nodeId = `node-finding-${i + 1}-${slugify(finding.identifier)}`;
    const node: AttackNode = {
      id: nodeId,
      semanticKey: `finding.${finding.kind}.${i + 1}`,
      title: `${isCred ? "Credential" : "Artifact"}: ${finding.identifier}`,
      description: finding.description,
      phase: isCred ? "vulnerability_analysis" : "threat_modeling",
      kind: isCred ? "credential_access" : "surface_discovery",
      spoilerLevel: 4 as SpoilerLevel,
      isEntryPoint: false,
      isTerminal: false,
      metadata: {
        provenance: finding.provenance,
      },
    };
    nodes.push(node);

    if (isCred) {
      credNodeIds.push(nodeId);
      // Link from vuln or surface
      const vulnSource = vulnNodeIds[0] || surfaceNodeIds[0] || entryNodeIds[0];
      if (vulnSource) {
        addEdge(vulnSource, nodeId, "Exposed via vulnerability/finding");
      }
    }
  }

  // 5. Attack Steps (Chronological path)
  const stepNodeIds: string[] = [];
  for (const step of facts.attackSteps) {
    const nodeId = `node-step-${step.stepNumber}`;

    let phase: AttackNodePhase = "exploitation";
    let kind: AttackNodeKind = "initial_access";
    let spoiler: SpoilerLevel = 4;

    if (step.phase === "reconnaissance") {
      phase = "reconnaissance";
      kind = "service_discovery";
      spoiler = 1;
    } else if (step.phase === "enumeration") {
      phase = "threat_modeling";
      kind = "local_enumeration";
      spoiler = 2;
    } else if (step.phase === "initial_access") {
      phase = "exploitation";
      kind = "initial_access";
      spoiler = 4;
    } else if (step.phase === "privilege_escalation") {
      phase = "post_exploitation";
      kind = "privilege_escalation";
      spoiler = 5;
    } else if (step.phase === "objective") {
      phase = "post_exploitation";
      kind = "objective_capture";
      spoiler = 6;
    }

    const node: AttackNode = {
      id: nodeId,
      semanticKey: `step.${step.stepNumber}.${slugify(step.action)}`,
      title: `Step ${step.stepNumber}: ${step.action}`,
      description: `Phase: ${step.phase}. Tools: ${step.toolsUsed.join(", ") || "none"}`,
      phase,
      kind,
      spoilerLevel: spoiler,
      isEntryPoint: step.stepNumber === 1 && entryNodeIds.length === 0,
      isTerminal: false,
      metadata: {
        toolsUsed: step.toolsUsed,
        provenance: step.provenance,
      },
    };

    nodes.push(node);
    stepNodeIds.push(nodeId);

    // Link previous step to current step in sequence
    if (stepNodeIds.length > 1) {
      const prevStepId = stepNodeIds[stepNodeIds.length - 2];
      addEdge(prevStepId, nodeId, "Sequential attack progression");
    } else if (entryNodeIds.length > 0) {
      addEdge(entryNodeIds[0], nodeId, "First action from recon");
    }
  }

  // 6. Objectives (Flags)
  const initialAccessNode =
    nodes.find((n) => n.kind === "initial_access")?.id ||
    stepNodeIds[0] ||
    vulnNodeIds[0] ||
    entryNodeIds[0];

  const privEscNode =
    nodes.find((n) => n.kind === "privilege_escalation")?.id ||
    initialAccessNode;

  for (let i = 0; i < facts.objectives.length; i++) {
    const obj = facts.objectives[i];
    const isRoot = obj.type === "root_flag" || /root/i.test(obj.name);
    const nodeId = `node-obj-${i + 1}-${slugify(obj.name)}`;

    const node: AttackNode = {
      id: nodeId,
      semanticKey: `objective.${slugify(obj.name)}`,
      title: obj.name,
      description: obj.location ? `Path: ${obj.location}` : obj.name,
      phase: "post_exploitation",
      kind: "objective_capture",
      spoilerLevel: (isRoot ? 6 : 5) as SpoilerLevel,
      isEntryPoint: false,
      isTerminal: true,
      metadata: {
        location: obj.location,
        provenance: obj.provenance,
      },
    };

    nodes.push(node);
    terminalNodeIds.push(nodeId);

    // Connect dependencies:
    // Root flag depends on privilege escalation
    // User flag depends on initial access
    if (isRoot) {
      addEdge(privEscNode, nodeId, "Requires elevated privileges");
    } else {
      addEdge(initialAccessNode, nodeId, "Requires local user access");
    }
  }

  // Fallback: If no terminal nodes exist, mark the last node as terminal
  if (terminalNodeIds.length === 0 && nodes.length > 0) {
    const lastNode = nodes[nodes.length - 1];
    (lastNode as { isTerminal: boolean }).isTerminal = true;
    terminalNodeIds.push(lastNode.id);
  }

  // 7. Verify DAG integrity and remove accidental cycles
  if (detectCycles(nodes, edges)) {
    // If cycle exists, keep only forward edges according to node index
    const nodeIndexMap = new Map<string, number>();
    nodes.forEach((n, idx) => nodeIndexMap.set(n.id, idx));

    const acyclicEdges = edges.filter((e) => {
      const srcIdx = nodeIndexMap.get(e.sourceNodeId) ?? 0;
      const tgtIdx = nodeIndexMap.get(e.targetNodeId) ?? 0;
      return srcIdx < tgtIdx;
    });

    edges.length = 0;
    edges.push(...acyclicEdges);
  }

  // 8. Compute Reference Path
  const referencePathNodeIds = findReferencePath(
    nodes,
    edges,
    entryNodeIds,
    terminalNodeIds,
  );

  const graph: AttackGraph = {
    id: `graph-${slugify(facts.profile.name || "machine")}-${Date.now()}`,
    machineName: facts.profile.name || "Target Machine",
    nodes,
    edges,
    referencePathNodeIds,
    entryNodeIds,
    terminalNodeIds,
    createdAt: new Date().toISOString(),
  };

  return AttackGraphSchema.parse(graph) as AttackGraph;
}
