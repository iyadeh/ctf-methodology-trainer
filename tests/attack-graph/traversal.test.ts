import { describe, expect, it } from "vitest";
import {
  detectCycles,
  findReferencePath,
  isNodeUnlocked,
  topologicalSort,
} from "../../src/modules/attack-graph/traversal";
import type { AttackEdge, AttackNode } from "../../src/modules/attack-graph/types";

describe("Attack Graph Traversal & Topology", () => {
  const nodeA: AttackNode = {
    id: "node-a",
    semanticKey: "service.http.80",
    title: "Port 80 HTTP",
    description: "Web port",
    phase: "reconnaissance",
    kind: "service_discovery",
    spoilerLevel: 1,
    isEntryPoint: true,
    isTerminal: false,
  };

  const nodeB: AttackNode = {
    id: "node-b",
    semanticKey: "surface.web.admin",
    title: "Admin Panel",
    description: "Web surface",
    phase: "threat_modeling",
    kind: "surface_discovery",
    spoilerLevel: 2,
    isEntryPoint: false,
    isTerminal: false,
  };

  const nodeC: AttackNode = {
    id: "node-c",
    semanticKey: "vuln.sqli",
    title: "SQL Injection",
    description: "Vulnerability",
    phase: "vulnerability_analysis",
    kind: "vulnerability_identification",
    spoilerLevel: 3,
    isEntryPoint: false,
    isTerminal: false,
  };

  const nodeD: AttackNode = {
    id: "node-d",
    semanticKey: "objective.root-flag",
    title: "Root Flag",
    description: "Final objective",
    phase: "post_exploitation",
    kind: "objective_capture",
    spoilerLevel: 6,
    isEntryPoint: false,
    isTerminal: true,
  };

  const sampleNodes = [nodeA, nodeB, nodeC, nodeD];

  describe("detectCycles", () => {
    it("returns false for a valid DAG without cycles", () => {
      const edges: AttackEdge[] = [
        { id: "e1", sourceNodeId: "node-a", targetNodeId: "node-b", dependencyType: "hard" },
        { id: "e2", sourceNodeId: "node-b", targetNodeId: "node-c", dependencyType: "hard" },
        { id: "e3", sourceNodeId: "node-c", targetNodeId: "node-d", dependencyType: "hard" },
      ];

      expect(detectCycles(sampleNodes, edges)).toBe(false);
    });

    it("detects a cycle when an edge points backward", () => {
      const cyclicEdges: AttackEdge[] = [
        { id: "e1", sourceNodeId: "node-a", targetNodeId: "node-b", dependencyType: "hard" },
        { id: "e2", sourceNodeId: "node-b", targetNodeId: "node-c", dependencyType: "hard" },
        { id: "e3", sourceNodeId: "node-c", targetNodeId: "node-a", dependencyType: "hard" }, // Back-edge to A
      ];

      expect(detectCycles(sampleNodes, cyclicEdges)).toBe(true);
    });
  });

  describe("topologicalSort", () => {
    it("returns node IDs in valid topological order", () => {
      const edges: AttackEdge[] = [
        { id: "e1", sourceNodeId: "node-a", targetNodeId: "node-b", dependencyType: "hard" },
        { id: "e2", sourceNodeId: "node-b", targetNodeId: "node-c", dependencyType: "hard" },
        { id: "e3", sourceNodeId: "node-c", targetNodeId: "node-d", dependencyType: "hard" },
      ];

      const order = topologicalSort(sampleNodes, edges);
      expect(order).toEqual(["node-a", "node-b", "node-c", "node-d"]);
    });
  });

  describe("isNodeUnlocked", () => {
    const edges: AttackEdge[] = [
      { id: "e1", sourceNodeId: "node-a", targetNodeId: "node-b", dependencyType: "hard" },
      { id: "e2", sourceNodeId: "node-b", targetNodeId: "node-c", dependencyType: "hard" },
    ];

    it("returns true for entry nodes with no prerequisites", () => {
      const satisfied = new Set<string>();
      expect(isNodeUnlocked("node-a", edges, satisfied)).toBe(true);
    });

    it("returns false if hard prerequisite is missing", () => {
      const satisfied = new Set<string>(["node-a"]);
      // node-c requires node-b
      expect(isNodeUnlocked("node-c", edges, satisfied)).toBe(false);
    });

    it("returns true when all hard prerequisites are satisfied", () => {
      const satisfied = new Set<string>(["node-a", "node-b"]);
      expect(isNodeUnlocked("node-c", edges, satisfied)).toBe(true);
    });
  });

  describe("findReferencePath", () => {
    it("computes path from entry node to terminal node", () => {
      const edges: AttackEdge[] = [
        { id: "e1", sourceNodeId: "node-a", targetNodeId: "node-b", dependencyType: "hard" },
        { id: "e2", sourceNodeId: "node-b", targetNodeId: "node-c", dependencyType: "hard" },
        { id: "e3", sourceNodeId: "node-c", targetNodeId: "node-d", dependencyType: "hard" },
      ];

      const path = findReferencePath(sampleNodes, edges, ["node-a"], ["node-d"]);
      expect(path).toEqual(["node-a", "node-b", "node-c", "node-d"]);
    });
  });
});
