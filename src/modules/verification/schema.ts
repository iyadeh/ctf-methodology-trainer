import { z } from "zod";

export const graphVerificationStatusSchema = z.enum([
  "validated",
  "low_confidence",
  "failed",
]);

export const verificationCheckNameSchema = z.enum([
  "acyclicity",
  "entry_points",
  "terminal_objectives",
  "reachability",
  "phase_ordering",
  "critical_milestones",
  "fact_alignment",
  "orphan_nodes",
]);

export const verificationCheckResultSchema = z.object({
  name: verificationCheckNameSchema,
  passed: z.boolean(),
  score: z.number().min(0).max(1),
  description: z.string(),
  issues: z.array(z.string()),
});

export const graphVerificationSchema = z.object({
  status: graphVerificationStatusSchema,
  confidence: z.number().min(0).max(1),
  missingSteps: z.array(z.string()),
  unsupportedSteps: z.array(z.string()),
  conflicts: z.array(z.string()),
  checks: z.array(verificationCheckResultSchema),
  verifiedAt: z.string(),
});

export type GraphVerificationOutput = z.infer<typeof graphVerificationSchema>;
