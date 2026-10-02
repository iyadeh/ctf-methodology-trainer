import { describe, expect, it } from "vitest";
import { buildAttackGraphFromFacts } from "../../src/modules/attack-graph/builder";
import { isNodeUnlocked } from "../../src/modules/attack-graph/traversal";
import type { ExtractedMachineFacts } from "../../src/modules/facts/types";

describe("Manual Attack Graph Verification & Visual Inspection", () => {
  const ctfMachineFacts: ExtractedMachineFacts = {
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
        provenance: "80/tcp open http nginx 1.18.0",
      },
      {
        port: 22,
        protocol: "tcp",
        service: "ssh",
        product: "OpenSSH",
        version: "8.9p1",
        provenance: "22/tcp open ssh OpenSSH 8.9p1",
      },
    ],
    surfaces: [
      {
        kind: "web",
        name: "Login Portal",
        urlOrPath: "/login.php",
        technologies: ["PHP 8.1", "Nginx"],
        provenance: "Directory fuzzing revealed /login.php",
      },
    ],
    findings: [
      {
        kind: "credential",
        identifier: "frank:SuperSecretPassword123",
        description: "Credentials dumped from database",
        provenance: "Extracted via SQL injection on page 3",
      },
    ],
    vulnerabilities: [
      {
        title: "SQL Injection on /search.php",
        category: "injection",
        cve: "CVE-2023-XXXX",
        affectedTarget: "http://10.10.11.224/search.php",
        description: "Union-based SQL injection allows database dump",
        severity: "high",
        provenance: "sqlmap confirmed union query on parameter id",
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
        action: "Initial Nmap port scan",
        toolsUsed: ["nmap"],
        prerequisites: [],
        provenance: "Discovered port 22 and 80",
      },
      {
        stepNumber: 2,
        phase: "initial_access",
        action: "SSH login as frank using dumped database credentials",
        toolsUsed: ["ssh"],
        prerequisites: ["frank:SuperSecretPassword123"],
        provenance: "Successful SSH auth into frank shell",
      },
      {
        stepNumber: 3,
        phase: "privilege_escalation",
        action: "Abuse sudo privileges on /bin/bash without password",
        toolsUsed: ["sudo"],
        prerequisites: [],
        provenance: "sudo /bin/bash -> root prompt #",
      },
    ],
    summary:
      "Friendly is an easy Linux machine featuring an exposed web service, SQL injection leading to credential dump, and passwordless sudo to root.",
  };

  it("prints a rich visual representation of the generated Attack Graph", () => {
    const graph = buildAttackGraphFromFacts(ctfMachineFacts);

    console.log("\n=======================================================");
    console.log(`[ATTACK GRAPH] Target: ${graph.machineName} (${ctfMachineFacts.profile.os.toUpperCase()} - ${ctfMachineFacts.profile.difficulty})`);
    console.log(`Total Nodes: ${graph.nodes.length} | Total Edges: ${graph.edges.length}`);
    console.log(`Entry Points: ${graph.entryNodeIds.length} | Terminals: ${graph.terminalNodeIds.length}`);
    console.log("=======================================================\n");

    console.log("--- 1. NODES TOPOLOGY (Grouped by PTES Phase) ---");
    const phaseGroups = new Map<string, typeof graph.nodes[0][]>();
    for (const node of graph.nodes) {
      const list = phaseGroups.get(node.phase) || [];
      list.push(node);
      phaseGroups.set(node.phase, list);
    }

    for (const [phase, nodes] of phaseGroups.entries()) {
      console.log(`\n* [Phase: ${phase.toUpperCase()}]`);
      for (const node of nodes) {
        const flag = node.isEntryPoint ? " [ENTRY]" : node.isTerminal ? " [TERMINAL]" : "";
        console.log(`   * (${node.id})${flag}`);
        console.log(`     Title: ${node.title}`);
        console.log(`     Kind: ${node.kind} | Spoiler Level: ${node.spoilerLevel}`);
        if (node.description) console.log(`     Detail: ${node.description}`);
      }
    }

    console.log("\n--- 2. GRAPH DEPENDENCIES & EDGES ---");
    for (const edge of graph.edges) {
      console.log(`   ${edge.sourceNodeId} ──[${edge.description || edge.dependencyType}]──► ${edge.targetNodeId}`);
    }

    console.log("\n--- 3. CANONICAL REFERENCE PATH (Reference Solution) ---");
    graph.referencePathNodeIds.forEach((nodeId, idx) => {
      const node = graph.nodes.find((n) => n.id === nodeId);
      console.log(`   ${idx + 1}. [${node?.phase.toUpperCase()}] ${node?.title}`);
    });

    console.log("\n--- 4. PROGRESSIVE UNLOCKING SIMULATION ---");
    const userLearnerEvidence = new Set<string>();

    const rootFlagNode = graph.nodes.find((n) => n.title.includes("Root Flag"))!;
    const entryServiceNode = graph.nodes.find((n) => n.isEntryPoint)!;
    const initialAccessNode = graph.nodes.find((n) => n.kind === "initial_access")!;

    console.log(`   * Entry node (${entryServiceNode.title}) unlocked at start? -> ${isNodeUnlocked(entryServiceNode.id, graph.edges, userLearnerEvidence)}`);
    console.log(`   * Initial Access node unlocked at start? -> ${isNodeUnlocked(initialAccessNode.id, graph.edges, userLearnerEvidence)}`);
    console.log(`   * Root Flag node unlocked at start? -> ${isNodeUnlocked(rootFlagNode.id, graph.edges, userLearnerEvidence)}`);

    // Simulate user confirming initial access prerequisites
    const credNode = graph.nodes.find((n) => n.kind === "credential_access");
    if (credNode) userLearnerEvidence.add(credNode.id);
    const vulnNode = graph.nodes.find((n) => n.kind === "vulnerability_identification");
    if (vulnNode) userLearnerEvidence.add(vulnNode.id);
    userLearnerEvidence.add(entryServiceNode.id);

    console.log(`   * After user confirms SQLi + Credential -> Initial Access unlocked? -> ${isNodeUnlocked(initialAccessNode.id, graph.edges, userLearnerEvidence)}`);

    console.log("\n=======================================================\n");

    expect(graph.nodes.length).toBeGreaterThan(5);
    expect(graph.edges.length).toBeGreaterThan(3);
  });
});
