import type { z } from "zod";
import type { MultimodalPart } from "../ai";
import type {
  ApplicationSurfaceFactSchema,
  AttackStepFactSchema,
  ExtractedMachineFactsSchema,
  FindingFactSchema,
  MachineProfileFactSchema,
  NetworkServiceFactSchema,
  ObjectiveFactSchema,
  VulnerabilityFactSchema,
} from "./schema";

export type MachineProfileFact = z.infer<typeof MachineProfileFactSchema>;
export type NetworkServiceFact = z.infer<typeof NetworkServiceFactSchema>;
export type ApplicationSurfaceFact = z.infer<typeof ApplicationSurfaceFactSchema>;
export type FindingFact = z.infer<typeof FindingFactSchema>;
export type VulnerabilityFact = z.infer<typeof VulnerabilityFactSchema>;
export type ObjectiveFact = z.infer<typeof ObjectiveFactSchema>;
export type AttackStepFact = z.infer<typeof AttackStepFactSchema>;
export type ExtractedMachineFacts = z.infer<typeof ExtractedMachineFactsSchema>;

export interface ExtractMachineFactsOptions {
  readonly writeupText: string;
  readonly mediaParts?: readonly MultimodalPart[];
  readonly model?: string;
}
