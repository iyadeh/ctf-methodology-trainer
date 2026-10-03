import { z } from "zod";

export const spoilerLevelSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const guidanceModeSchema = z.enum([
  "methodology_hint",
  "concept_explanation",
  "next_step_guidance",
  "review_hint",
]);

export const allowedHiddenNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  phase: z.enum([
    "reconnaissance",
    "threat_modeling",
    "vulnerability_analysis",
    "exploitation",
    "post_exploitation",
    "reporting",
  ]),
  kind: z.enum([
    "service_discovery",
    "surface_discovery",
    "vulnerability_identification",
    "credential_access",
    "initial_access",
    "local_enumeration",
    "privilege_escalation",
    "objective_capture",
    "lateral_movement",
  ]),
  spoilerLevel: spoilerLevelSchema,
  summary: z.string(),
  toolsAllowed: z.array(z.string()).optional(),
});

export const filteredHiddenContextSchema = z.object({
  requestedLevel: spoilerLevelSchema,
  levelName: z.enum([
    "methodology",
    "concept",
    "technique",
    "tool",
    "machine_context",
    "partial_solution",
    "full_reveal",
  ]),
  allowedNodes: z.array(allowedHiddenNodeSchema),
  redactedItems: z.array(z.string()),
  guidanceScope: z.string(),
  currentFrontierMilestone: z.string().optional(),
});

export const guidanceResponseSchema = z.object({
  content: z.string().min(1),
  spoilerLevel: spoilerLevelSchema,
  conceptExplanation: z.string().optional(),
  recommendedTechnique: z.string().optional(),
  suggestedTools: z.array(z.string()).optional(),
});

export type GuidanceResponseOutput = z.infer<typeof guidanceResponseSchema>;
