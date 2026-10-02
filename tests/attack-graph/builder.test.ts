import { describe, expect, it } from "vitest";
import { buildAttackGraphFromFacts } from "../../src/modules/attack-graph/builder";
import { AttackGraphSchema } from "../../src/modules/attack-graph/schema";
import { detectCycles } from "../../src/modules/attack-graph/traversal";
import type { ExtractedMachineFacts } from "../../src/modules/facts/types";

describe("Attack Graph Builder", () => {
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

  it("builds a complete, valid Attack Graph matching AttackGraphSchema", () => {
    const graph = buildAttackGraphFromFacts(sampleFacts);

    const parsed = AttackGraphSchema.safeParse(graph);
    expect(parsed.success).toBe(true);

    expect(graph.machineName).toBe("Friendly");
    expect(graph.nodes.length).toBeGreaterThan(5);
    expect(graph.edges.length).toBeGreaterThan(3);
    expect(graph.entryNodeIds.length).toBeGreaterThan(0);
    expect(graph.terminalNodeIds.length).toBeGreaterThan(0);
  });

  it("ensures the graph is a Directed Acyclic Graph (DAG) with no cycles", () => {
    const graph = buildAttackGraphFromFacts(sampleFacts);
    const hasCycle = detectCycles(graph.nodes, graph.edges);
    expect(hasCycle).toBe(false);
  });

  it("identifies entry points and terminal nodes properly", () => {
    const graph = buildAttackGraphFromFacts(sampleFacts);

    const entryNodes = graph.nodes.filter((n) => n.isEntryPoint);
    expect(entryNodes.length).toBeGreaterThan(0);
    expect(entryNodes.every((n) => n.phase === "reconnaissance")).toBe(true);

    const terminalNodes = graph.nodes.filter((n) => n.isTerminal);
    expect(terminalNodes.length).toBeGreaterThan(0);
    expect(terminalNodes.some((n) => n.title.includes("Root Flag"))).toBe(true);
  });

  it("generates a non-empty reference path connecting entry to terminal", () => {
    const graph = buildAttackGraphFromFacts(sampleFacts);
    expect(graph.referencePathNodeIds.length).toBeGreaterThan(0);

    // The reference path starts with an entry node
    const firstNodeId = graph.referencePathNodeIds[0];
    const firstNode = graph.nodes.find((n) => n.id === firstNodeId);
    expect(firstNode?.isEntryPoint).toBe(true);
  });

  it("handles minimal facts gracefully without crashing", () => {
    const minimalFacts: ExtractedMachineFacts = {
      profile: {
        name: "BareMachine",
        platform: "CTF",
        os: "unknown",
        difficulty: "unknown",
      },
      services: [],
      surfaces: [],
      findings: [],
      vulnerabilities: [],
      objectives: [],
      attackSteps: [],
      summary: "Empty test machine.",
    };

    const graph = buildAttackGraphFromFacts(minimalFacts);
    expect(graph.machineName).toBe("BareMachine");
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.entryNodeIds.length).toBeGreaterThan(0);
    expect(graph.terminalNodeIds.length).toBeGreaterThan(0);

    const parsed = AttackGraphSchema.safeParse(graph);
    expect(parsed.success).toBe(true);
  });
});
