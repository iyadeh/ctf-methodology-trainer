import { describe, expect, it } from "vitest";
import {
  allPlaybooks,
  getAllPlaybooks,
  getGenericServicePlaybook,
  getNativePlaybooks,
  getPlaybookById,
  getPlaybookBySlug,
  resolvePlaybooks,
} from "./index";

describe("Playbook Registry", () => {
  it("registers all 11 native playbooks plus 1 generic service playbook", () => {
    expect(getAllPlaybooks()).toHaveLength(12);
    expect(getNativePlaybooks()).toHaveLength(11);
    expect(getGenericServicePlaybook().id).toBe("generic-service");
  });

  it("ensures all playbooks have unique IDs and slugs", () => {
    const ids = allPlaybooks.map((p) => p.id);
    const slugs = allPlaybooks.map((p) => p.slug);
    expect(new Set(ids).size).toBe(allPlaybooks.length);
    expect(new Set(slugs).size).toBe(allPlaybooks.length);
  });

  it("verifies lookups by ID and Slug", () => {
    expect(getPlaybookById("native-http")?.slug).toBe("http");
    expect(getPlaybookBySlug("ssh")?.id).toBe("native-ssh");
    expect(getPlaybookById("non-existent")).toBeUndefined();
    expect(getPlaybookBySlug("non-existent")).toBeUndefined();
  });

  it("ensures all checks across all playbooks have valid, unique semantic keys and valid priorities", () => {
    const validPriorities = new Set(["required", "recommended", "suggested"]);
    const allSemanticKeys: string[] = [];

    for (const playbook of allPlaybooks) {
      expect(playbook.version).toBeGreaterThanOrEqual(1);
      expect(playbook.checks.length).toBeGreaterThan(0);

      playbook.checks.forEach((check, index) => {
        expect(check.sortOrder).toBe(index);
        expect(check.title.trim().length).toBeGreaterThan(0);
        expect(check.description.trim().length).toBeGreaterThan(0);
        expect(validPriorities.has(check.priority)).toBe(true);
        expect(check.semanticKey.startsWith("playbook.")).toBe(true);
        allSemanticKeys.push(check.semanticKey);
      });
    }

    expect(new Set(allSemanticKeys).size).toBe(allSemanticKeys.length);
  });
});

describe("Playbook Resolver", () => {
  it("returns no playbooks when active context is empty", () => {
    const result = resolvePlaybooks([]);
    expect(result.matched).toHaveLength(0);
  });

  it("resolves HTTP playbook when service:http is active", () => {
    const result = resolvePlaybooks(["service:http"]);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].playbook.slug).toBe("http");
    expect(result.matched[0].isFallback).toBe(false);
    expect(result.matched[0].triggeredByServiceKey).toBe("service:http");
  });

  it("resolves HTTP playbook when protocol:https is active", () => {
    const result = resolvePlaybooks(["protocol:https"]);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].playbook.slug).toBe("http");
    expect(result.matched[0].isFallback).toBe(false);
  });

  it("resolves SSH, SMB, and FTP playbooks simultaneously", () => {
    const result = resolvePlaybooks(["service:ssh", "service:smb", "service:ftp"]);
    expect(result.matched).toHaveLength(3);
    const slugs = result.matched.map((m) => m.playbook.slug).sort();
    expect(slugs).toEqual(["ftp", "smb", "ssh"]);
    expect(result.matched.every((m) => !m.isFallback)).toBe(true);
  });

  it("activates Linux Post-Exploitation by default on local-shell without Windows OS", () => {
    const result = resolvePlaybooks(["access:local-shell"]);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].playbook.slug).toBe("linux-post-exploitation");
    expect(result.matched[0].isFallback).toBe(false);
  });

  it("activates Linux Post-Exploitation when os:linux is confirmed", () => {
    const result = resolvePlaybooks(["access:local-shell", "os:linux"]);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].playbook.slug).toBe("linux-post-exploitation");
  });

  it("activates Windows Post-Exploitation and prevents Linux activation when os:windows is confirmed", () => {
    const result = resolvePlaybooks(["access:local-shell", "os:windows"]);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].playbook.slug).toBe("windows-post-exploitation");
    expect(result.matched.some((m) => m.playbook.slug === "linux-post-exploitation")).toBe(false);
  });

  it("activates Generic Service Playbook fallback for unknown services", () => {
    const result = resolvePlaybooks(["service:mqtt"]);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].playbook.slug).toBe("generic-service");
    expect(result.matched[0].isFallback).toBe(true);
    expect(result.matched[0].triggeredByServiceKey).toBe("service:mqtt");
  });

  it("activates separate generic fallback instances for multiple unknown services", () => {
    const result = resolvePlaybooks(["service:mqtt", "service:redis"]);
    expect(result.matched).toHaveLength(2);
    expect(result.matched[0].playbook.slug).toBe("generic-service");
    expect(result.matched[0].triggeredByServiceKey).toBe("service:mqtt");
    expect(result.matched[1].playbook.slug).toBe("generic-service");
    expect(result.matched[1].triggeredByServiceKey).toBe("service:redis");
  });

  it("correctly partitions native playbooks and generic fallback services in mixed environments", () => {
    const result = resolvePlaybooks([
      "service:http",
      "service:ssh",
      "service:redis",
      "surface:web",
    ]);

    expect(result.matched).toHaveLength(3); // http, ssh, and redis fallback
    const nativeMatches = result.matched.filter((m) => !m.isFallback);
    const fallbackMatches = result.matched.filter((m) => m.isFallback);

    expect(nativeMatches.map((m) => m.playbook.slug).sort()).toEqual(["http", "ssh"]);
    expect(fallbackMatches).toHaveLength(1);
    expect(fallbackMatches[0].playbook.slug).toBe("generic-service");
    expect(fallbackMatches[0].triggeredByServiceKey).toBe("service:redis");
  });
});
