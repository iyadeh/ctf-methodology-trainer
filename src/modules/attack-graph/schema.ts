import { z } from "zod";

export const SpoilerLevelSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const AttackNodeKindSchema = z.enum([
  "service_discovery",
  "surface_discovery",
  "vulnerability_identification",
  "credential_access",
  "initial_access",
  "local_enumeration",
  "privilege_escalation",
  "objective_capture",
  "lateral_movement",
]);

export const AttackNodePhaseSchema = z.enum([
  "reconnaissance",
  "threat_modeling",
  "vulnerability_analysis",
  "exploitation",
  "post_exploitation",
  "reporting",
]);

export const DependencyTypeSchema = z.enum(["hard", "soft"]);

export const AttackNodeMetadataSchema = z.object({
  port: z.number().int().min(1).max(65535).optional(),
  protocol: z.enum(["tcp", "udp"]).optional(),
  service: z.string().optional(),
  cve: z.string().optional(),
  toolsUsed: z.array(z.string()).optional(),
  targetIp: z.string().optional(),
  provenance: z.string().optional(),
  location: z.string().optional(),
});

export const AttackNodeSchema = z.object({
  id: z.string().min(1, "Node id is required"),
  semanticKey: z.string().min(1, "Semantic key is required"),
  title: z.string().min(1, "Node title is required"),
  description: z.string().default(""),
  phase: AttackNodePhaseSchema,
  kind: AttackNodeKindSchema,
  spoilerLevel: SpoilerLevelSchema.default(2),
  isEntryPoint: z.boolean().default(false),
  isTerminal: z.boolean().default(false),
  metadata: AttackNodeMetadataSchema.optional(),
});

export const AttackEdgeSchema = z.object({
  id: z.string().min(1, "Edge id is required"),
  sourceNodeId: z.string().min(1, "Source node id is required"),
  targetNodeId: z.string().min(1, "Target node id is required"),
  dependencyType: DependencyTypeSchema.default("hard"),
  description: z.string().optional(),
});

export const AttackGraphSchema = z.object({
  id: z.string().min(1, "Graph id is required"),
  machineName: z.string().min(1, "Machine name is required"),
  nodes: z.array(AttackNodeSchema).min(1, "Attack graph must contain at least one node"),
  edges: z.array(AttackEdgeSchema).default([]),
  referencePathNodeIds: z.array(z.string()).default([]),
  entryNodeIds: z.array(z.string()).default([]),
  terminalNodeIds: z.array(z.string()).default([]),
  createdAt: z.string().default(() => new Date().toISOString()),
});
