import { z } from "zod";

export const MachineProfileFactSchema = z.preprocess((val: unknown) => {
  if (!val || typeof val !== "object") return { name: "Target Machine" };
  const v = val as Record<string, unknown>;
  const name =
    v.name !== undefined ? v.name : v.machine_name !== undefined ? v.machine_name : v.title !== undefined ? v.title : "Target Machine";
  return {
    name,
    platform: v.platform || "Unknown",
    os: v.os || "unknown",
    difficulty: v.difficulty || "unknown",
    author: v.author,
    targetIp: v.targetIp || v.target_ip || v.ip,
  };
}, z.object({
  name: z.string().min(1, "Machine name is required"),
  platform: z.string().default("Unknown"),
  os: z.enum(["linux", "windows", "other", "unknown"]).default("unknown"),
  difficulty: z.enum(["easy", "medium", "hard", "insane", "unknown"]).default("unknown"),
  author: z.string().optional(),
  targetIp: z.string().optional(),
}));

export const NetworkServiceFactSchema = z.preprocess((val: unknown) => {
  if (!val || typeof val !== "object") return val;
  const v = val as Record<string, unknown>;
  const rawPort = v.port || v.port_number;
  const port = typeof rawPort === "string" ? parseInt(rawPort, 10) : rawPort;
  return {
    port: typeof port === "number" && !isNaN(port) ? port : 0,
    protocol: v.protocol === "udp" ? "udp" : "tcp",
    service: v.service || v.service_name || v.name || "unknown",
    product: v.product,
    version: v.version,
    banner: v.banner,
    provenance: v.provenance || v.evidence || v.notes || "Discovered in writeup",
  };
}, z.object({
  port: z.number().int().min(1).max(65535),
  protocol: z.enum(["tcp", "udp"]).default("tcp"),
  service: z.string().min(1).default("unknown"),
  product: z.string().optional(),
  version: z.string().optional(),
  banner: z.string().optional(),
  provenance: z.string().min(1).default("Discovered in writeup"),
}));

export const ApplicationSurfaceFactSchema = z.preprocess((val: unknown) => {
  if (!val || typeof val !== "object") return val;
  const v = val as Record<string, unknown>;
  return {
    kind: v.kind || "web",
    name: v.name || v.title || "Web Application",
    urlOrPath: v.urlOrPath || v.url || v.path || v.endpoint,
    technologies: Array.isArray(v.technologies) ? v.technologies : [],
    provenance: v.provenance || v.evidence || "Discovered in writeup",
  };
}, z.object({
  kind: z.enum(["web", "api", "database", "cms", "management", "other"]).default("web"),
  name: z.string().min(1).default("Web Application"),
  urlOrPath: z.string().optional(),
  technologies: z.array(z.string()).default([]),
  provenance: z.string().min(1).default("Discovered in writeup"),
}));

export const FindingFactSchema = z.preprocess((val: unknown) => {
  if (!val || typeof val !== "object") return val;
  const v = val as Record<string, unknown>;
  const provenance =
    v.provenance !== undefined ? v.provenance : v.evidence !== undefined ? v.evidence : "Found in writeup";
  return {
    kind: v.kind || "other",
    identifier: v.identifier || v.name || v.value || v.key || "Artifact",
    description: v.description || v.details || v.identifier || "Discovered artifact",
    provenance,
  };
}, z.object({
  kind: z.enum([
    "credential",
    "file",
    "directory",
    "hash",
    "ssh_key",
    "source_code",
    "secret",
    "user",
    "other",
  ]).default("other"),
  identifier: z.string().min(1).default("Artifact"),
  description: z.string().min(1).default("Discovered artifact"),
  provenance: z.string().min(1, "Provenance citation is required"),
}));

export const VulnerabilityFactSchema = z.preprocess((val: unknown) => {
  if (!val || typeof val !== "object") return val;
  const v = val as Record<string, unknown>;
  return {
    title: v.title || v.name || v.vulnerability || "Vulnerability",
    category: v.category || v.type || "vulnerability",
    cve: v.cve,
    affectedTarget:
      v.affectedTarget || v.target || v.affected_target || v.service || "Target system",
    description: v.description || v.details || v.title || "Vulnerability described in writeup",
    severity: v.severity || "medium",
    provenance: v.provenance || v.evidence || "Demonstrated in writeup",
  };
}, z.object({
  title: z.string().min(1).default("Vulnerability"),
  category: z.string().min(1).default("vulnerability"),
  cve: z.string().optional(),
  affectedTarget: z.string().min(1).default("Target system"),
  description: z.string().min(1).default("Vulnerability described in writeup"),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  provenance: z.string().min(1).default("Demonstrated in writeup"),
}));

export const ObjectiveFactSchema = z.preprocess((val: unknown) => {
  if (!val || typeof val !== "object") return val;
  const v = val as Record<string, unknown>;
  return {
    name: v.name || v.title || v.flag || "Flag / Objective",
    location: v.location || v.path,
    type: v.type || "objective",
    provenance: v.provenance || v.evidence || "Captured in writeup",
  };
}, z.object({
  name: z.string().min(1).default("Flag / Objective"),
  location: z.string().optional(),
  type: z.enum(["user_flag", "root_flag", "data_exfiltration", "objective"]).default("objective"),
  provenance: z.string().min(1).default("Captured in writeup"),
}));

export const AttackStepFactSchema = z.preprocess((val: unknown) => {
  if (!val || typeof val !== "object") return val;
  const v = val as Record<string, unknown>;
  return {
    stepNumber:
      typeof v.stepNumber === "number" ? v.stepNumber : typeof v.step === "number" ? v.step : 1,
    phase: v.phase || "enumeration",
    action: v.action || v.description || "Executed step",
    toolsUsed: Array.isArray(v.toolsUsed) ? v.toolsUsed : Array.isArray(v.tools) ? v.tools : [],
    prerequisites: Array.isArray(v.prerequisites) ? v.prerequisites : [],
    provenance: v.provenance || v.evidence || "Documented in writeup",
  };
}, z.object({
  stepNumber: z.number().int().min(1).default(1),
  phase: z.enum([
    "reconnaissance",
    "initial_access",
    "enumeration",
    "lateral_movement",
    "privilege_escalation",
    "objective",
  ]).default("enumeration"),
  action: z.string().min(1).default("Executed step"),
  toolsUsed: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  provenance: z.string().min(1).default("Documented in writeup"),
}));

export const ExtractedMachineFactsSchema = z.preprocess((val: unknown) => {
  if (!val || typeof val !== "object") return val;
  const v = val as Record<string, unknown>;

  // Normalize top-level profile if nested or snake_case
  let profile = v.profile || v.machine_profile || v.target_profile;
  if (!profile) {
    profile = {
      name: v.machine_name || v.target_name || v.name || "Target Machine",
      platform: v.platform || "Unknown",
      os: v.os || "unknown",
      difficulty: v.difficulty || "unknown",
      author: v.author,
      targetIp: v.targetIp || v.target_ip || v.ip,
    };
  }

  return {
    profile,
    services: v.services || v.network_services || v.ports || [],
    surfaces: v.surfaces || v.application_surfaces || [],
    findings: v.findings || v.artifacts || v.credentials || [],
    vulnerabilities: v.vulnerabilities || v.vulns || [],
    objectives: v.objectives || v.flags || [],
    attackSteps: v.attackSteps || v.attack_steps || v.steps || [],
    summary: v.summary || v.overview || v.description || "Extraction completed.",
  };
}, z.object({
  profile: MachineProfileFactSchema,
  services: z.array(NetworkServiceFactSchema).default([]),
  surfaces: z.array(ApplicationSurfaceFactSchema).default([]),
  findings: z.array(FindingFactSchema).default([]),
  vulnerabilities: z.array(VulnerabilityFactSchema).default([]),
  objectives: z.array(ObjectiveFactSchema).default([]),
  attackSteps: z.array(AttackStepFactSchema).default([]),
  summary: z.string().min(1).default("Machine extraction completed."),
}));
