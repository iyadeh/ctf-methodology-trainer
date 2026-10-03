import { describe, expect, it } from "vitest";
import type { AttackGraph } from "../../src/modules/attack-graph/types";
import {
  filterHiddenContextBySpoilerLevel,
  redactSensitiveText,
} from "../../src/modules/guidance/policy";

describe("Stage 21: Guidance & Spoiler Policy", () => {
  const sampleGraph: AttackGraph = {
    id: "graph-sample",
    machineName: "Baseme",
    nodes: [
      {
        id: "node-recon-1",
        semanticKey: "recon.nmap.port-80",
        phase: "reconnaissance",
        kind: "service_discovery",
        title: "Nmap Port 80 Open",
        description: "Apache HTTP server version 2.4.41 detected on port 80.",
        spoilerLevel: 0,
        isEntryPoint: true,
        isTerminal: false,
      },
      {
        id: "node-vuln-1",
        semanticKey: "vuln.admin.default-creds",
        phase: "vulnerability_analysis",
        kind: "vulnerability_identification",
        title: "Default Admin Credentials on Portal",
        description: "Portal at /admin.php has default credentials admin:secret1234.",
        spoilerLevel: 4,
        isEntryPoint: false,
        isTerminal: false,
      },
      {
        id: "node-exploit-1",
        semanticKey: "exploit.privesc.suid",
        phase: "exploitation",
        kind: "credential_access",
        title: "Privilege Escalation via SUID",
        description: "Execute /usr/bin/python to read /root/root.txt containing HTB{m4st3r_fl4g_1337}.",
        spoilerLevel: 5,
        isEntryPoint: false,
        isTerminal: false,
      },
      {
        id: "node-post-1",
        semanticKey: "post.root.flag",
        phase: "post_exploitation",
        kind: "objective_capture",
        title: "Root Flag Captured",
        description: "Captured flag HTB{m4st3r_fl4g_1337} with root:toor credentials.",
        spoilerLevel: 6,
        isEntryPoint: false,
        isTerminal: true,
      },
    ],
    edges: [],
    entryNodeIds: ["node-recon-1"],
    terminalNodeIds: ["node-post-1"],
    referencePathNodeIds: ["node-recon-1", "node-vuln-1", "node-exploit-1", "node-post-1"],
    createdAt: new Date().toISOString(),
  };

  describe("redactSensitiveText", () => {
    it("redacts credentials from text unless confirmed by learner", () => {
      const text = "Connect using admin:secretpassword123 via ssh.";
      const unconfirmed = redactSensitiveText(text, new Set());
      expect(unconfirmed.redactedText).toBe("Connect using admin:[REDACTED_PASSWORD] via ssh.");
      expect(unconfirmed.redactedItems).toContain("admin:secretpassword123");

      const confirmed = redactSensitiveText(text, new Set(["admin:secretpassword123"]));
      expect(confirmed.redactedText).toBe(text);
      expect(confirmed.redactedItems).toHaveLength(0);
    });

    it("redacts CTF/HTB flags from text", () => {
      const text = "Found flag HTB{p0wn3d_fl4g_h3r3} in /var/www.";
      const res = redactSensitiveText(text, new Set());
      expect(res.redactedText).toBe("Found flag [REDACTED_FLAG] in /var/www.");
      expect(res.redactedItems).toContain("HTB{p0wn3d_fl4g_h3r3}");
    });

    it("redacts root flag file paths", () => {
      const text = "Read root flag at /root/root.txt for final proof.";
      const res = redactSensitiveText(text, new Set());
      expect(res.redactedText).toBe("Read root flag at [REDACTED_FLAG_PATH] for final proof.");
      expect(res.redactedItems).toContain("/root/root.txt");
    });
  });

  describe("filterHiddenContextBySpoilerLevel - Context Minimization", () => {
    it("returns zero hidden nodes for Spoiler Levels 0 through 3 (Context Minimization)", () => {
      for (const level of [0, 1, 2, 3] as const) {
        const result = filterHiddenContextBySpoilerLevel({
          graph: sampleGraph,
          spoilerLevel: level,
          currentPhaseKey: "reconnaissance",
        });

        expect(result.allowedNodes).toHaveLength(0);
        expect(result.redactedItems).toHaveLength(0);
        expect(result.requestedLevel).toBe(level);
        expect(result.guidanceScope).toBeTruthy();
      }
    });

    it("restricts nodes to current phase and redacts secrets at Level 4 (Machine Context)", () => {
      const result = filterHiddenContextBySpoilerLevel({
        graph: sampleGraph,
        spoilerLevel: 4,
        currentPhaseKey: "vulnerability_analysis",
      });

      expect(result.allowedNodes.length).toBeGreaterThan(0);
      for (const node of result.allowedNodes) {
        expect(node.spoilerLevel).toBeLessThanOrEqual(4);
        expect(node.summary).not.toContain("secret1234");
      }
      expect(result.redactedItems).toContain("admin:secret1234");
    });

    it("allows current + next phase attack guidance with credentials redacted at Level 5", () => {
      const result = filterHiddenContextBySpoilerLevel({
        graph: sampleGraph,
        spoilerLevel: 5,
        currentPhaseKey: "vulnerability_analysis",
      });

      // Exploitation node is in next phase and spoilerLevel 5
      const exploitNode = result.allowedNodes.find((n) => n.id === "node-exploit-1");
      expect(exploitNode).toBeDefined();
      expect(exploitNode?.summary).toContain("[REDACTED_FLAG]");
      expect(exploitNode?.summary).not.toContain("HTB{m4st3r_fl4g_1337}");
    });

    it("provides full unredacted reveal at Level 6 (Full Reveal)", () => {
      const result = filterHiddenContextBySpoilerLevel({
        graph: sampleGraph,
        spoilerLevel: 6,
        currentPhaseKey: "post_exploitation",
      });

      const postNode = result.allowedNodes.find((n) => n.id === "node-post-1");
      expect(postNode).toBeDefined();
      expect(postNode?.summary).toContain("HTB{m4st3r_fl4g_1337}");
      expect(postNode?.summary).toContain("root:toor");
    });
  });
});
