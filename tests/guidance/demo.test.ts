import { describe, it } from "vitest";
import type { AttackGraph } from "../../src/modules/attack-graph/types";
import {
  calculateSpoilerPenalty,
  prepareGuidancePromptContext,
} from "../../src/modules/guidance/engine";
import { filterHiddenContextBySpoilerLevel } from "../../src/modules/guidance/policy";
import type { SpoilerLevel } from "../../src/modules/guidance/types";
import type { TrainingSessionAggregate } from "../../src/modules/training/types";

describe("Stage 21: Manual Guidance & Spoiler Engine Inspection", () => {
  const sampleGraph: AttackGraph = {
    id: "graph-friendly",
    machineName: "Friendly",
    nodes: [
      {
        id: "node-1",
        semanticKey: "recon.nmap.scan",
        phase: "reconnaissance",
        kind: "service_discovery",
        title: "Nmap Port 80 & 22 Open",
        description: "Apache HTTP and OpenSSH detected on target 10.10.11.224.",
        spoilerLevel: 0,
        isEntryPoint: true,
        isTerminal: false,
      },
      {
        id: "node-2",
        semanticKey: "threat.web.portal",
        phase: "threat_modeling",
        kind: "surface_discovery",
        title: "Discovered Staff Login Portal",
        description: "Portal found at http://10.10.11.224/login.php with database auth.",
        spoilerLevel: 2,
        isEntryPoint: false,
        isTerminal: false,
      },
      {
        id: "node-3",
        semanticKey: "vuln.sqli.login",
        phase: "vulnerability_analysis",
        kind: "vulnerability_identification",
        title: "SQL Injection in Login Form",
        description: "SQLi in login form exposes credentials frank:SuperSecretPassword123.",
        spoilerLevel: 4,
        isEntryPoint: false,
        isTerminal: false,
      },
      {
        id: "node-4",
        semanticKey: "exploit.ssh.access",
        phase: "exploitation",
        kind: "initial_access",
        title: "SSH Initial Foothold",
        description: "Login with frank:SuperSecretPassword123 via SSH to read /home/frank/user.txt.",
        spoilerLevel: 5,
        isEntryPoint: false,
        isTerminal: false,
      },
      {
        id: "node-5",
        semanticKey: "post.root.flag",
        phase: "post_exploitation",
        kind: "objective_capture",
        title: "Privilege Escalation to Root",
        description: "Sudo vulnerability grants root access to read /root/root.txt containing HTB{p0wn3d_fr13ndly_m4ch1n3_2026}.",
        spoilerLevel: 6,
        isEntryPoint: false,
        isTerminal: true,
      },
    ],
    edges: [],
    entryNodeIds: ["node-1"],
    terminalNodeIds: ["node-5"],
    referencePathNodeIds: ["node-1", "node-2", "node-3", "node-4", "node-5"],
    createdAt: new Date().toISOString(),
  };

  const mockSession: TrainingSessionAggregate = {
    session: {
      id: "session-demo-1",
      name: "Friendly Machine Training",
      frameworkId: "ptes-standard",
      status: "in_progress",
      targetIp: "10.10.11.224",
      startedAt: new Date(),
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    phases: [],
    currentPhase: {
      id: "phase-vuln-analysis",
      trainingSessionId: "session-demo-1",
      frameworkPhaseId: "fw-vuln-analysis",
      semanticKey: "vulnerability_analysis",
      name: "Vulnerability Analysis",
      description: "Identify discoverable security flaws",
      sortOrder: 3,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      checks: [
        {
          id: "chk-1",
          trainingSessionId: "session-demo-1",
          sessionPhaseId: "phase-vuln-analysis",
          frameworkCheckId: null,
          semanticKey: "vuln.sqli.check",
          title: "Test Authentication Endpoints for Injection",
          description: "Inspect login inputs for SQLi / Auth bypass",
          priority: "required",
          provenance: "playbook",
          sortOrder: 1,
          status: "active",
          sourceVersion: 1,
          activatedAt: new Date(),
          completedAt: null,
          skippedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
    findings: [
      {
        id: "f-1",
        trainingSessionId: "session-demo-1",
        title: "HTTP Port 80 Open",
        category: "service",
        evidence: "80/tcp open http",
        evidenceState: "confirmed",
        contextKind: "service",
        contextValue: "http",
        importance: "high",
        source: "user",
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    hypotheses: [],
    attempts: [],
    notes: [],
    context: [],
    progress: {
      required: { total: 1, completed: 0, percentage: 0 },
      coverage: { total: 1, completed: 0, percentage: 0 },
      completedChecks: 0,
      remainingChecks: 1,
    },
  };

  it("prints a rich visual comparison of Spoiler Levels 0 through 6", () => {
    console.log("\n================================================================================");
    console.log("             STAGE 21: GUIDANCE & SPOILER ENGINE MANUAL INSPECTION             ");
    console.log("================================================================================");
    console.log(`Machine Target  : ${sampleGraph.machineName} (${mockSession.session.targetIp})`);
    console.log(`Current Phase   : ${mockSession.currentPhase?.name} (${mockSession.currentPhase?.semanticKey})`);
    console.log(`Active Check    : ${mockSession.currentPhase?.checks[0].title}`);
    console.log(`Total Graph Nodes : ${sampleGraph.nodes.length} hidden nodes in reference attack graph`);
    console.log("--------------------------------------------------------------------------------\n");

    const levels: SpoilerLevel[] = [0, 1, 2, 3, 4, 5, 6];

    for (const lvl of levels) {
      const penalty = calculateSpoilerPenalty(lvl);
      const filtered = filterHiddenContextBySpoilerLevel({
        graph: sampleGraph,
        spoilerLevel: lvl,
        currentPhaseKey: mockSession.currentPhase?.semanticKey || "vulnerability_analysis",
      });

      console.log(`[LEVEL ${lvl}] ${filtered.levelName.toUpperCase()} (Evaluation Penalty: -${penalty} pts)`);
      console.log(`  Guidance Scope : ${filtered.guidanceScope}`);
      console.log(`  Allowed Nodes  : ${filtered.allowedNodes.length} node(s) injected into prompt`);

      if (filtered.allowedNodes.length === 0) {
        console.log("  Context Policy : ZERO hidden nodes exposed (Context Minimization strictly enforced)");
      } else {
        for (const n of filtered.allowedNodes) {
          console.log(`    ↳ [Node ${n.id} | ${n.phase}] ${n.title}`);
          console.log(`      Content : "${n.summary}"`);
        }
      }

      if (filtered.redactedItems.length > 0) {
        console.log(`  Redacted Items : ${filtered.redactedItems.join(", ")}`);
      }
      console.log("");
    }

    console.log("--------------------------------------------------------------------------------");
    console.log("SIMULATING FULL AI MENTOR PROMPT CONTEXT (SPOILER LEVEL 4)");
    console.log("--------------------------------------------------------------------------------");
    const promptCtx = prepareGuidancePromptContext({
      session: mockSession,
      graph: sampleGraph,
      spoilerLevel: 4,
      userQuery: "I'm stuck at the login page, what should I check?",
    });

    console.log("SYSTEM INSTRUCTION:");
    console.log(promptCtx.systemInstruction);
    console.log("\nVISIBLE STATE SENT TO AI:");
    console.log(`  Learner Phase   : ${promptCtx.visibleState.currentPhase}`);
    console.log(`  Active Checks   : ${promptCtx.visibleState.activeChecks.map((c) => c.title).join(", ")}`);
    console.log(`  Confirmed Items : ${promptCtx.visibleState.confirmedFindings.map((f) => f.identifier).join(", ")}`);
    console.log("\nHIDDEN CONTEXT SENT TO AI (Level 4 Restricted & Redacted):");
    console.log(JSON.stringify(promptCtx.filteredHiddenContext.allowedNodes, null, 2));
    console.log("================================================================================\n");
  });
});
