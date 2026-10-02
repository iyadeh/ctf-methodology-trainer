import { describe, expect, it, vi } from "vitest";
import * as aiModule from "../../src/modules/ai";
import {
  ExtractedMachineFactsSchema,
  extractMachineFacts,
  type ExtractedMachineFacts,
} from "../../src/modules/facts";

describe("Fact Extraction Module", () => {
  const sampleValidFacts: ExtractedMachineFacts = {
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
        port: 22,
        protocol: "tcp",
        service: "ssh",
        product: "OpenSSH",
        version: "8.9p1",
        provenance: "Nmap scan output in section 1: 22/tcp open ssh OpenSSH 8.9p1",
      },
      {
        port: 80,
        protocol: "tcp",
        service: "http",
        product: "nginx",
        version: "1.18.0",
        provenance: "Nmap scan output: 80/tcp open http nginx 1.18.0",
      },
    ],
    surfaces: [
      {
        kind: "web",
        name: "Friendly Web Portal",
        urlOrPath: "/login.php",
        technologies: ["PHP 8.1", "Nginx"],
        provenance: "Directory fuzzing revealed /login.php endpoint",
      },
    ],
    findings: [
      {
        kind: "credential",
        identifier: "admin:SuperSecretPassword!",
        description: "Hardcoded administrative credentials found in backup.sql",
        provenance: "Found in /var/www/html/backup.sql on page 3",
      },
    ],
    vulnerabilities: [
      {
        title: "SQL Injection in User Search",
        category: "injection",
        cve: "CVE-2023-XXXX",
        affectedTarget: "http://10.10.11.224/search.php",
        description: "Unsanitized parameter id leads to union-based SQL injection",
        severity: "high",
        provenance: "Demonstrated in sqlmap output on page 4",
      },
    ],
    objectives: [
      {
        name: "User Flag",
        location: "/home/frank/user.txt",
        type: "user_flag",
        provenance: "Captured user flag with cat /home/frank/user.txt",
      },
      {
        name: "Root Flag",
        location: "/root/root.txt",
        type: "root_flag",
        provenance: "Captured root flag after sudo escalation",
      },
    ],
    attackSteps: [
      {
        stepNumber: 1,
        phase: "reconnaissance",
        action: "Executed nmap TCP port scan discovering ports 22 and 80",
        toolsUsed: ["nmap"],
        prerequisites: [],
        provenance: "Section 1: Initial Port Scan",
      },
      {
        stepNumber: 2,
        phase: "initial_access",
        action: "Exploited SQL injection to dump administrative credentials and login",
        toolsUsed: ["sqlmap", "burpsuite"],
        prerequisites: ["admin:SuperSecretPassword!"],
        provenance: "Section 3: Gaining Access",
      },
      {
        stepNumber: 3,
        phase: "privilege_escalation",
        action: "Abused sudo privilege on /bin/bash to gain root shell",
        toolsUsed: ["sudo"],
        prerequisites: ["frank shell"],
        provenance: "Section 4: Privilege Escalation",
      },
    ],
    summary:
      "Friendly is an easy Linux machine involving an nmap scan, SQL injection on a login page to extract credentials, and a simple sudo misconfiguration for root.",
  };

  describe("ExtractedMachineFactsSchema Validation", () => {
    it("successfully validates a complete facts object", () => {
      const parsed = ExtractedMachineFactsSchema.safeParse(sampleValidFacts);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.profile.name).toBe("Friendly");
        expect(parsed.data.services).toHaveLength(2);
        expect(parsed.data.attackSteps).toHaveLength(3);
      }
    });

    it("applies default values for optional lists and enums", () => {
      const minimal = {
        profile: {
          name: "MinimalBox",
        },
        summary: "A minimal test machine.",
      };

      const parsed = ExtractedMachineFactsSchema.safeParse(minimal);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.profile.os).toBe("unknown");
        expect(parsed.data.profile.difficulty).toBe("unknown");
        expect(parsed.data.profile.platform).toBe("Unknown");
        expect(parsed.data.services).toEqual([]);
        expect(parsed.data.findings).toEqual([]);
        expect(parsed.data.vulnerabilities).toEqual([]);
      }
    });

    it("rejects when required machine name is empty", () => {
      const invalid = {
        ...sampleValidFacts,
        profile: {
          ...sampleValidFacts.profile,
          name: "",
        },
      };

      const parsed = ExtractedMachineFactsSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it("rejects invalid network port numbers outside 1-65535", () => {
      const invalid = {
        ...sampleValidFacts,
        services: [
          {
            port: 70000, // Invalid port
            protocol: "tcp",
            service: "unknown",
            provenance: "Nmap scan",
          },
        ],
      };

      const parsed = ExtractedMachineFactsSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it("rejects items without provenance citations", () => {
      const invalid = {
        ...sampleValidFacts,
        findings: [
          {
            kind: "credential",
            identifier: "root:root",
            description: "Default password",
            provenance: "", // Empty provenance
          },
        ],
      };

      const parsed = ExtractedMachineFactsSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe("extractMachineFacts function", () => {
    it("throws an error when writeup text is empty or whitespace", async () => {
      await expect(
        extractMachineFacts({ writeupText: "   " }),
      ).rejects.toThrowError(/Writeup text cannot be empty/);
    });

    it("invokes generateStructuredAI with structured schema and returns validated facts", async () => {
      const spy = vi
        .spyOn(aiModule, "generateStructuredAI")
        .mockResolvedValue(sampleValidFacts as never);

      const writeupText = `# Friendly HackTheBox Walkthrough
Port 22 and 80 are open. Found SQLi in search.php...`;

      const result = await extractMachineFacts({
        writeupText,
      });

      expect(result).toEqual(sampleValidFacts);
      expect(spy).toHaveBeenCalledTimes(1);

      const callArgs = spy.mock.calls[0][0];
      expect(callArgs.schema).toBe(ExtractedMachineFactsSchema);
      expect(callArgs.temperature).toBe(0.1);
      expect(callArgs.systemInstruction).toBeDefined();

      spy.mockRestore();
    });

    it("includes multimodal media parts when provided", async () => {
      const spy = vi
        .spyOn(aiModule, "generateStructuredAI")
        .mockResolvedValue(sampleValidFacts as never);

      const fakeImagePart = {
        inlineData: {
          data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          mimeType: "image/png",
        },
      };

      await extractMachineFacts({
        writeupText: "See attached screenshot of nmap results.",
        mediaParts: [fakeImagePart],
      });

      expect(spy).toHaveBeenCalledTimes(1);
      const callArgs = spy.mock.calls[0][0];
      const contents = callArgs.contents as unknown[];
      expect(contents).toHaveLength(2);
      expect(contents[1]).toEqual(fakeImagePart);

      spy.mockRestore();
    });
  });
});
