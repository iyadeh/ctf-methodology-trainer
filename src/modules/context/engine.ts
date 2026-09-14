import type { findings, findingContextKindEnum } from "../../lib/db/schema";

export type ContextKind = typeof findingContextKindEnum.enumValues[number];
export type StructuredFindingEvidence = Pick<
  typeof findings.$inferSelect, "evidenceState" | "contextKind" | "contextValue"
>;

type NormalizationRule = {
  kind: ContextKind;
  aliases: readonly string[];
  keys: readonly string[];
};

// Exact aliases only. Version banners and prose must be recorded separately.
const normalizationRules: readonly NormalizationRule[] = [
  { kind: "service", aliases: ["http", "apache", "apache http server", "nginx", "microsoft-iis"], keys: ["service:http"] },
  { kind: "service", aliases: ["https", "ssl/http", "apache over tls"], keys: ["service:http", "protocol:https"] },
  { kind: "protocol", aliases: ["https", "ssl/http"], keys: ["service:http", "protocol:https"] },
  { kind: "protocol", aliases: ["http"], keys: ["service:http"] },
  { kind: "service", aliases: ["ssh", "openssh"], keys: ["service:ssh"] },
  { kind: "service", aliases: ["smb", "microsoft smb", "samba"], keys: ["service:smb"] },
  { kind: "service", aliases: ["ftp"], keys: ["service:ftp"] },
  { kind: "service", aliases: ["dns"], keys: ["service:dns"] },
  { kind: "service", aliases: ["snmp"], keys: ["service:snmp"] },
  { kind: "service", aliases: ["ldap"], keys: ["service:ldap"] },
  { kind: "service", aliases: ["nfs"], keys: ["service:nfs"] },
  { kind: "service", aliases: ["smtp"], keys: ["service:smtp"] },
  { kind: "os", aliases: ["linux", "gnu/linux"], keys: ["os:linux"] },
  { kind: "os", aliases: ["windows", "microsoft windows"], keys: ["os:windows"] },
  { kind: "surface", aliases: ["authentication"], keys: ["surface:authentication"] },
  { kind: "access", aliases: ["local-shell", "local shell"], keys: ["access:local-shell"] },
  { kind: "access", aliases: ["remote-shell", "remote shell"], keys: ["access:remote-shell"] },
];

export function normalizeContext(kind: ContextKind, value: string): string[] {
  const alias = value.trim().toLowerCase().replace(/\s+/g, " ");
  const keys = normalizationRules
    .filter((rule) => rule.kind === kind && rule.aliases.includes(alias))
    .flatMap((rule) => rule.keys);
  // Unknown values remain evidence; no arbitrary canonical keys are invented.
  return [...new Set(keys)].sort();
}

export function deriveContextFromFinding(finding: StructuredFindingEvidence): string[] {
  if (finding.evidenceState !== "confirmed" || !finding.contextKind || !finding.contextValue) {
    return [];
  }
  return normalizeContext(finding.contextKind, finding.contextValue);
}
