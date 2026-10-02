import { describe, it } from "vitest";
import { buildAttackGraphFromFacts } from "../../src/modules/attack-graph/builder";
import type { AttackGraph } from "../../src/modules/attack-graph/types";
import type { ExtractedMachineFacts } from "../../src/modules/facts/types";
import { verifyAttackGraph } from "../../src/modules/verification";

describe("Manual Automated Verification Visual Inspection", () => {
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

  it("prints a rich visual report of valid and failed graph verification", () => {
    const validGraph = buildAttackGraphFromFacts(sampleFacts);
    const validResult = verifyAttackGraph({ graph: validGraph, facts: sampleFacts });

    // Sever all edges to terminal nodes to create a broken/failed graph
    const terminalIds = new Set(validGraph.terminalNodeIds);
    const brokenGraph: AttackGraph = {
      ...validGraph,
      edges: validGraph.edges.filter((e) => !terminalIds.has(e.targetNodeId)),
    };
    const brokenResult = verifyAttackGraph({ graph: brokenGraph, facts: sampleFacts });

    console.log("\n=======================================================");
    console.log("       AUTOMATED GRAPH VERIFICATION REPORT");
    console.log("=======================================================\n");

    console.log("--- SCENARIO 1: VALID ATTACK GRAPH ---");
    console.log(`Target Machine : ${validGraph.machineName}`);
    console.log(`Status         : [${validResult.status.toUpperCase()}]`);
    console.log(`Confidence     : ${(validResult.confidence * 100).toFixed(0)}%`);
    console.log(`Missing Steps  : ${validResult.missingSteps.length}`);
    console.log(`Conflicts      : ${validResult.conflicts.length}`);
    console.log("\nVerification Checks Detail:");
    for (const check of validResult.checks) {
      const mark = check.passed ? "✓ PASS" : "✗ FAIL";
      console.log(`  [${mark}] ${check.name.padEnd(20)}: ${check.description}`);
    }

    console.log("\n-------------------------------------------------------");
    console.log("--- SCENARIO 2: BROKEN GRAPH (UNREACHABLE OBJECTIVES) ---");
    console.log(`Target Machine : ${brokenGraph.machineName}`);
    console.log(`Status         : [${brokenResult.status.toUpperCase()}]`);
    console.log(`Confidence     : ${(brokenResult.confidence * 100).toFixed(0)}%`);
    console.log(`Missing Steps  : ${brokenResult.missingSteps.length}`);
    for (const s of brokenResult.missingSteps) {
      console.log(`  - ✗ ${s}`);
    }
    console.log(`Conflicts      : ${brokenResult.conflicts.length}`);
    for (const c of brokenResult.conflicts) {
      console.log(`  - ✗ ${c}`);
    }
    console.log("\nVerification Checks Detail:");
    for (const check of brokenResult.checks) {
      const mark = check.passed ? "✓ PASS" : "✗ FAIL";
      console.log(`  [${mark}] ${check.name.padEnd(20)}: ${check.description}`);
      if (check.issues.length > 0) {
        for (const issue of check.issues) {
          console.log(`        ↳ Issue: ${issue}`);
        }
      }
    }
    console.log("=======================================================\n");
  });
});
