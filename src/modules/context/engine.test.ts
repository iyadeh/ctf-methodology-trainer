import { describe, expect, it } from "vitest";
import { deriveContextFromFinding, normalizeContext, type ContextKind } from "./engine";

describe("context normalization", () => {
  it.each([
    ["service", "http", ["service:http"]],
    ["service", " HTTP ", ["service:http"]],
    ["service", "Apache HTTP Server", ["service:http"]],
    ["service", "nginx", ["service:http"]],
    ["service", "Microsoft-IIS", ["service:http"]],
    ["service", "https", ["protocol:https", "service:http"]],
    ["service", "ssl/http", ["protocol:https", "service:http"]],
    ["service", "Apache over TLS", ["protocol:https", "service:http"]],
    ["protocol", "HTTPS", ["protocol:https", "service:http"]],
    ["service", "OpenSSH", ["service:ssh"]],
    ["service", "SSH", ["service:ssh"]],
    ["service", "Samba", ["service:smb"]],
    ["service", "SMB", ["service:smb"]],
    ["service", "Microsoft SMB", ["service:smb"]],
    ["os", "GNU/Linux", ["os:linux"]],
    ["os", "Linux", ["os:linux"]],
    ["os", "Microsoft Windows", ["os:windows"]],
    ["os", "Windows", ["os:windows"]],
    ["surface", "authentication", ["surface:authentication"]],
    ["access", "local shell", ["access:local-shell"]],
    ["access", "remote-shell", ["access:remote-shell"]],
  ] as [ContextKind, string, string[]][])("normalizes %s / %s", (kind, value, expected) => {
    expect(normalizeContext(kind, value)).toEqual(expected);
  });

  it("keeps unknown values, ports, prose, and mismatched kinds out of canonical context", () => {
    for (const value of ["80", "22", "SomeCustomDaemon", "HTTP may be available", "OpenSSH 9.0"]) {
      expect(normalizeContext("service", value)).toEqual([]);
    }
    expect(normalizeContext("os", "nginx")).toEqual([]);
    expect(normalizeContext("protocol", "TLS")).toEqual([]);
  });

  it("returns deterministic deduplicated canonical keys", () => {
    const keys = normalizeContext("service", "HTTPS");
    expect(keys).toEqual([...new Set(keys)].sort());
    expect(keys).toEqual(normalizeContext("service", "ssl/http"));
  });
});

describe("context derivation", () => {
  it.each(["observed", "inferred"] as const)("does not activate %s evidence", (evidenceState) => {
    expect(deriveContextFromFinding({ evidenceState, contextKind: "service", contextValue: "HTTP" }))
      .toEqual([]);
  });

  it("derives only confirmed structured evidence", () => {
    expect(deriveContextFromFinding({ evidenceState: "confirmed", contextKind: "service", contextValue: "HTTP" }))
      .toEqual(["service:http"]);
    expect(deriveContextFromFinding({ evidenceState: "confirmed", contextKind: "service", contextValue: "HTTPS" }))
      .toEqual(["protocol:https", "service:http"]);
    expect(deriveContextFromFinding({ evidenceState: "confirmed", contextKind: null, contextValue: null }))
      .toEqual([]);
  });
});
