import { describe, expect, it } from "vitest";
import { buildAttackGraphFromFacts } from "../../src/modules/attack-graph/builder";
import type { AttackEdge, AttackGraph, AttackNode } from "../../src/modules/attack-graph/types";
import type { ExtractedMachineFacts } from "../../src/modules/facts/types";
import {
  assertGraphVerification,
  GenerationVerificationError,
  graphVerificationSchema,
  verifyAttackGraph,
} from "../../src/modules/verification";

describe("Stage 19: Automated Graph Verification", () => {
  const sampleFacts: ExtractedMachineFacts = {
    profile: {
      name: "Friendly",
      platform: "HackTheBox",
      os: "linux",
      difficulty: "easy",
      author: "polarbear",
      targetIp: "10.10.11.224",
    },
    services: [
      {
        port: 80,
        protocol: "tcp",
        service: "http",
        product: "nginx",
        version: "1.18.0",
        provenance: "80/tcp open http",
      },
      {
        port: 22,
        protocol: "tcp",
        service: "ssh",
        product: "OpenSSH",
        version: "8.9p1",
        provenance: "22/tcp open ssh",
      },
    ],
    surfaces: [
      {
        kind: "web",
        name: "Login Portal",
        urlOrPath: "/login.php",
        technologies: ["PHP", "Nginx"],
        provenance: "Directory search found /login.php",
      },
    ],
    findings: [
      {
        kind: "credential",
        identifier: "frank:password123",
        description: "Hardcoded credentials in config",
        provenance: "Found in /var/www/config.php",
      },
    ],
    vulnerabilities: [
      {
        title: "SQL Injection in Search",
        category: "injection",
        affectedTarget: "http://10.10.11.224/search.php",
        description: "Union-based SQL injection",
        severity: "high",
        provenance: "Demonstrated via sqlmap",
      },
    ],
    objectives: [
      {
        name: "User Flag",
        location: "/home/frank/user.txt",
        type: "user_flag",
        provenance: "cat /home/frank/user.txt",
      },
      {
        name: "Root Flag",
        location: "/root/root.txt",
        type: "root_flag",
        provenance: "cat /root/root.txt",
      },
    ],
    attackSteps: [
      {
        stepNumber: 1,
        phase: "reconnaissance",
        action: "Run nmap scan on port 80 and 22",
        toolsUsed: ["nmap"],
        prerequisites: [],
        provenance: "Initial scan",
      },
      {
        stepNumber: 2,
        phase: "initial_access",
        action: "Login via SSH using discovered frank credentials",
        toolsUsed: ["ssh"],
        prerequisites: ["frank:password123"],
        provenance: "SSH login",
      },
      {
        stepNumber: 3,
        phase: "privilege_escalation",
        action: "Sudo bash without password",
        toolsUsed: ["sudo"],
        prerequisites: [],
        provenance: "sudo -l",
      },
    ],
    summary: "Friendly machine testing writeup.",
  };

  it("validates a well-formed graph built from facts with high confidence", () => {
    const graph = buildAttackGraphFromFacts(sampleFacts);
    const verification = verifyAttackGraph({ graph, facts: sampleFacts });

    const parsed = graphVerificationSchema.safeParse(verification);
    expect(parsed.success).toBe(true);

    expect(verification.status).toBe("validated");
    expect(verification.confidence).toBeGreaterThanOrEqual(0.85);
    expect(verification.conflicts).toHaveLength(0);
    expect(verification.missingSteps).toHaveLength(0);

    const acyclicityCheck = verification.checks.find((c) => c.name === "acyclicity");
    expect(acyclicityCheck?.passed).toBe(true);

    const reachabilityCheck = verification.checks.find((c) => c.name === "reachability");
    expect(reachabilityCheck?.passed).toBe(true);

    // assertGraphVerification must not throw
    expect(() => assertGraphVerification(verification)).not.toThrow();
  });

  it("fails verification and flags conflict when graph contains a cycle", () => {
    const validGraph = buildAttackGraphFromFacts(sampleFacts);

    // Inject a circular dependency: node 2 -> node 1 when node 1 -> node 2
    const edge1 = validGraph.edges[0];
    const cyclicEdge: AttackEdge = {
      id: "edge-cycle",
      sourceNodeId: edge1.targetNodeId,
      targetNodeId: edge1.sourceNodeId,
      dependencyType: "hard",
      description: "Cyclic edge injection",
    };

    const cyclicGraph: AttackGraph = {
      ...validGraph,
      edges: [...validGraph.edges, cyclicEdge],
    };

    const verification = verifyAttackGraph({ graph: cyclicGraph });

    expect(verification.status).toBe("failed");
    expect(verification.conflicts.some((c) => c.toLowerCase().includes("circular") || c.toLowerCase().includes("dag"))).toBe(true);

    const acyclicityCheck = verification.checks.find((c) => c.name === "acyclicity");
    expect(acyclicityCheck?.passed).toBe(false);

    expect(() => assertGraphVerification(verification)).toThrow(GenerationVerificationError);
  });

  it("fails verification when graph has no entry points", () => {
    const validGraph = buildAttackGraphFromFacts(sampleFacts);

    const noEntryGraph: AttackGraph = {
      ...validGraph,
      entryNodeIds: [],
      nodes: validGraph.nodes.map((n) => ({ ...n, isEntryPoint: false })),
    };

    const verification = verifyAttackGraph({ graph: noEntryGraph });

    expect(verification.status).toBe("failed");
    expect(verification.missingSteps.some((s) => s.toLowerCase().includes("entry point"))).toBe(true);

    const entryCheck = verification.checks.find((c) => c.name === "entry_points");
    expect(entryCheck?.passed).toBe(false);

    expect(() => assertGraphVerification(verification)).toThrow(GenerationVerificationError);
  });

  it("fails verification when graph has no terminal objectives", () => {
    const validGraph = buildAttackGraphFromFacts(sampleFacts);

    const noTerminalGraph: AttackGraph = {
      ...validGraph,
      terminalNodeIds: [],
      nodes: validGraph.nodes.map((n) => ({ ...n, isTerminal: false })),
    };

    const verification = verifyAttackGraph({ graph: noTerminalGraph });

    expect(verification.status).toBe("failed");
    expect(verification.missingSteps.some((s) => s.toLowerCase().includes("terminal objective"))).toBe(true);

    const terminalCheck = verification.checks.find((c) => c.name === "terminal_objectives");
    expect(terminalCheck?.passed).toBe(false);

    expect(() => assertGraphVerification(verification)).toThrow(GenerationVerificationError);
  });

  it("fails verification when terminal objectives are disconnected and unreachable", () => {
    const validGraph = buildAttackGraphFromFacts(sampleFacts);

    // Sever all edges pointing to terminal nodes
    const terminalIds = new Set(validGraph.terminalNodeIds);
    const severedEdges = validGraph.edges.filter((e) => !terminalIds.has(e.targetNodeId));

    const disconnectedGraph: AttackGraph = {
      ...validGraph,
      edges: severedEdges,
    };

    const verification = verifyAttackGraph({ graph: disconnectedGraph });

    expect(verification.status).toBe("failed");
    expect(
      verification.conflicts.some((c) => c.toLowerCase().includes("disconnected") || c.toLowerCase().includes("unreachable")),
    ).toBe(true);

    const reachabilityCheck = verification.checks.find((c) => c.name === "reachability");
    expect(reachabilityCheck?.passed).toBe(false);

    expect(() => assertGraphVerification(verification)).toThrow(GenerationVerificationError);
  });

  it("fails verification when post-exploitation exists without initial access / exploitation node", () => {
    const entryNode: AttackNode = {
      id: "node-recon",
      semanticKey: "service.http",
      title: "HTTP Discovery",
      description: "Port 80 open",
      phase: "reconnaissance",
      kind: "service_discovery",
      spoilerLevel: 1,
      isEntryPoint: true,
      isTerminal: false,
    };

    const rootFlagNode: AttackNode = {
      id: "node-root",
      semanticKey: "objective.root",
      title: "Root Flag",
      description: "Proof of root",
      phase: "post_exploitation",
      kind: "objective_capture",
      spoilerLevel: 6,
      isEntryPoint: false,
      isTerminal: true,
    };

    const edge: AttackEdge = {
      id: "edge-1",
      sourceNodeId: "node-recon",
      targetNodeId: "node-root",
      dependencyType: "hard",
    };

    const skippingGraph: AttackGraph = {
      id: "graph-skip",
      machineName: "Skippy",
      nodes: [entryNode, rootFlagNode],
      edges: [edge],
      entryNodeIds: ["node-recon"],
      terminalNodeIds: ["node-root"],
      referencePathNodeIds: ["node-recon", "node-root"],
      createdAt: new Date().toISOString(),
    };

    const verification = verifyAttackGraph({ graph: skippingGraph });

    expect(verification.status).toBe("failed");
    expect(
      verification.missingSteps.some((s) => s.toLowerCase().includes("initial access")),
    ).toBe(true);

    const milestoneCheck = verification.checks.find((c) => c.name === "critical_milestones");
    expect(milestoneCheck?.passed).toBe(false);

    expect(() => assertGraphVerification(verification)).toThrow(GenerationVerificationError);
  });

  it("detects orphan intermediate nodes as unsupported steps", () => {
    const validGraph = buildAttackGraphFromFacts(sampleFacts);

    const orphanNode: AttackNode = {
      id: "node-floating-extra",
      semanticKey: "note.random",
      title: "Floating Random Note",
      description: "A node not connected anywhere",
      phase: "reconnaissance",
      kind: "surface_discovery",
      spoilerLevel: 2,
      isEntryPoint: false,
      isTerminal: false,
    };

    const graphWithOrphan: AttackGraph = {
      ...validGraph,
      nodes: [...validGraph.nodes, orphanNode],
    };

    const verification = verifyAttackGraph({ graph: graphWithOrphan });

    expect(
      verification.unsupportedSteps.some((u) => u.includes("Floating Random Note")),
    ).toBe(true);

    const orphanCheck = verification.checks.find((c) => c.name === "orphan_nodes");
    expect(orphanCheck?.passed).toBe(false);
  });

  it("detects inverted phase ordering when post_exploitation hard-depends on earlier phase backwards", () => {
    const validGraph = buildAttackGraphFromFacts(sampleFacts);

    // Find a post-exploitation node and a reconnaissance node
    const postExploitNode = validGraph.nodes.find((n) => n.phase === "post_exploitation");
    const reconNode = validGraph.nodes.find((n) => n.phase === "reconnaissance");

    expect(postExploitNode).toBeDefined();
    expect(reconNode).toBeDefined();

    // Create an edge where post_exploitation is a hard dependency FOR reconnaissance
    const invertedEdge: AttackEdge = {
      id: "edge-inverted",
      sourceNodeId: postExploitNode!.id,
      targetNodeId: reconNode!.id,
      dependencyType: "hard",
      description: "Invalid reverse dependency",
    };

    const invertedGraph: AttackGraph = {
      ...validGraph,
      edges: [...validGraph.edges, invertedEdge],
    };

    const verification = verifyAttackGraph({ graph: invertedGraph });

    expect(
      verification.conflicts.some((c) => c.toLowerCase().includes("inverted phase ordering")),
    ).toBe(true);

    const orderingCheck = verification.checks.find((c) => c.name === "phase_ordering");
    expect(orderingCheck?.passed).toBe(false);
  });
});
