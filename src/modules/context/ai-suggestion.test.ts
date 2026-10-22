import { describe, expect, it } from "vitest";
import {
  contextSuggestionSchema,
  detectContextHeuristically,
  type ContextSuggestion,
} from "./ai-suggestion";
import { normalizeContext } from "./engine";

describe("Context Suggestion Schema", () => {
  it("validates a compliant suggestion payload", () => {
    const valid: ContextSuggestion = {
      hasSuggestion: true,
      contextKind: "access",
      contextValue: "local-shell",
      category: "Local Privilege Escalation",
      confidence: "high",
      reasoning: "User obtained shell context",
      activatesPlaybook: "Linux Post-Exploitation & Privilege Escalation",
    };

    const parsed = contextSuggestionSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });
});

describe("Heuristic Context Detection", () => {
  it("detects access: local-shell from sudo NOPASSWD and user switching evidence", () => {
    const input = {
      title: "Custom sudo NOPASSWD rules for check_parser and a.sh",
      category: "Sudo Misconfiguration",
      evidence: `$ sudo -n -l
User chaojibaolong may run the following commands on longshao:
    (ALL : ALL) NOPASSWD: /usr/local/bin/check_parser
$ id
uid=1002(chaojiwudilong) gid=1002(chaojiwudilong)`,
      currentContextKind: "access",
      currentContextValue: "sudo NOPASSWD",
    };

    const suggestion = detectContextHeuristically(input);
    expect(suggestion.hasSuggestion).toBe(true);
    expect(suggestion.contextKind).toBe("access");
    expect(suggestion.contextValue).toBe("local-shell");

    // Must normalize to canonical key
    const canonical = normalizeContext(suggestion.contextKind!, suggestion.contextValue!);
    expect(canonical).toContain("access:local-shell");
  });

  it("detects access: root-shell from root uid=0 evidence", () => {
    const input = {
      title: "a.sh eval/source-file injection as root",
      category: "Local Privilege Escalation",
      evidence: `$ printf '%s\\n' '. ...' | sudo -n /usr/local/bin/a.sh
uid=0(root) gid=0(root) groups=0(root)`,
      currentContextKind: "access",
      currentContextValue: "a.sh eval injection, root",
    };

    const suggestion = detectContextHeuristically(input);
    expect(suggestion.hasSuggestion).toBe(true);
    expect(suggestion.contextKind).toBe("access");
    expect(suggestion.contextValue).toBe("root-shell");

    // Must normalize to canonical key
    const canonical = normalizeContext(suggestion.contextKind!, suggestion.contextValue!);
    expect(canonical).toContain("access:local-shell");
    expect(canonical).toContain("access:root-shell");
  });

  it("detects service: http from web server evidence", () => {
    const input = {
      title: "Apache Web Server on port 80",
      category: "Network Service",
      evidence: `HTTP/1.1 200 OK\nServer: Apache/2.4.52 (Ubuntu)`,
    };

    const suggestion = detectContextHeuristically(input);
    expect(suggestion.hasSuggestion).toBe(true);
    expect(suggestion.contextKind).toBe("service");
    expect(suggestion.contextValue).toBe("http");

    const canonical = normalizeContext(suggestion.contextKind!, suggestion.contextValue!);
    expect(canonical).toContain("service:http");
  });

  it("detects service: ssh from OpenSSH evidence", () => {
    const input = {
      title: "SSH on port 22",
      category: "Network Service",
      evidence: `SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.6`,
    };

    const suggestion = detectContextHeuristically(input);
    expect(suggestion.hasSuggestion).toBe(true);
    expect(suggestion.contextKind).toBe("service");
    expect(suggestion.contextValue).toBe("ssh");

    const canonical = normalizeContext(suggestion.contextKind!, suggestion.contextValue!);
    expect(canonical).toContain("service:ssh");
  });
});
