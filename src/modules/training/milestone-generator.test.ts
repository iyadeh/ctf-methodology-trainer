import { describe, expect, it } from "vitest";
import type { ExtractedMachineFacts } from "../facts/types";
import {
  generateGenericMethodologyMilestones,
  generateMilestonesFromFactsAndGraph,
} from "./milestone-generator";

describe("Milestone Generator", () => {
  const mockFacts: ExtractedMachineFacts = {
    profile: {
      name: "Headless",
      platform: "Hack The Box",
      os: "linux",
      difficulty: "easy",
      targetIp: "10.10.11.8",
    },
    services: [
      {
        port: 22,
        protocol: "tcp",
        service: "ssh",
        version: "OpenSSH 9.2p1",
        banner: "OpenSSH 9.2p1 Debian 2+deb12u2",
        provenance: "Writeup nmap scan",
      },
      {
        port: 5000,
        protocol: "tcp",
        service: "http",
        version: "Werkzeug 2.2.2",
        banner: "Werkzeug/2.2.2 Python/3.11.2",
        provenance: "Writeup nmap scan",
      },
    ],
    surfaces: [
      {
        name: "Support Contact Form",
        kind: "web",
        urlOrPath: "/support",
        technologies: ["Python", "Flask", "Werkzeug"],
        provenance: "Writeup web recon",
      },
    ],
    findings: [
      {
        kind: "user",
        identifier: "dvir",
        description: "Standard system user account discovered",
        provenance: "Writeup section initial access",
      },
    ],
    vulnerabilities: [
      {
        title: "Cross-Site Scripting to Cookie Theft",
        category: "XSS",
        affectedTarget: "/support form User-Agent header",
        description: "Admin cookie is exfiltrated via blind XSS payload",
        severity: "high",
        provenance: "Writeup exploitation",
      },
      {
        title: "Sudo NOPASSWD misconfiguration on /usr/bin/syscheck",
        category: "Privilege Escalation",
        affectedTarget: "syscheck script",
        description: "User dvir can execute syscheck without password",
        severity: "high",
        provenance: "Writeup privesc",
      },
    ],
    objectives: [
      {
        name: "HTB{user_flag_hash_12345}",
        location: "/home/dvir/user.txt",
        type: "user_flag",
        provenance: "Writeup user flag",
      },
      {
        name: "HTB{root_flag_hash_67890}",
        location: "/root/root.txt",
        type: "root_flag",
        provenance: "Writeup root flag",
      },
    ],
    attackSteps: [
      {
        stepNumber: 1,
        phase: "reconnaissance",
        action: "Nmap port scan",
        toolsUsed: ["nmap"],
        prerequisites: [],
        provenance: "Writeup recon",
      },
      {
        stepNumber: 2,
        phase: "privilege_escalation",
        action: "Run syscheck script via sudo -l to get root",
        toolsUsed: ["sudo"],
        prerequisites: ["user shell"],
        provenance: "Writeup privesc",
      },
    ],
    summary: "Headless machine writeup extraction.",
  };

  it("generates sequential milestone tasks from extracted machine facts", () => {
    const milestones = generateMilestonesFromFactsAndGraph(mockFacts);

    expect(milestones.length).toBeGreaterThanOrEqual(6);

    // Sequence check
    milestones.forEach((m, idx) => {
      expect(m.sortOrder).toBe(idx + 1);
    });

    // First milestone is unlocked, others are locked
    expect(milestones[0].status).toBe("unlocked");
    expect(milestones[1].status).toBe("locked");

    // Task 1: Open Ports Discovery
    expect(milestones[0].title).toBe("Open Ports Discovery");
    expect(milestones[0].expectedAnswer).toContain("2");
    expect(milestones[0].formatHint).toBe("Format: Angka (contoh: 2)");
    expect(milestones[0].answerHash).toBeDefined();

    // Check user flag task
    const userFlagTask = milestones.find((m) => m.taskType === "user_flag");
    expect(userFlagTask).toBeDefined();
    expect(userFlagTask?.expectedAnswer).toBe("HTB{user_flag_hash_12345}");

    // Check root flag task
    const rootFlagTask = milestones.find((m) => m.taskType === "root_flag");
    expect(rootFlagTask).toBeDefined();
    expect(rootFlagTask?.expectedAnswer).toBe("HTB{root_flag_hash_67890}");
  });

  it("generates generic methodology milestones as fallback", () => {
    const generic = generateGenericMethodologyMilestones("Custom Machine");

    expect(generic).toHaveLength(6);
    expect(generic[0].status).toBe("unlocked");
    expect(generic[0].sortOrder).toBe(1);
    expect(generic[0].question).toContain("Custom Machine");

    const flagTasks = generic.filter(
      (m) => m.taskType === "user_flag" || m.taskType === "root_flag",
    );
    expect(flagTasks).toHaveLength(2);
  });
});
