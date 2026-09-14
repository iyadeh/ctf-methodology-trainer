import { z } from "zod";
import {
  attemptOutcomeEnum,
  findingEvidenceStateEnum,
  findingContextKindEnum,
  findingImportanceEnum,
  hypothesisOutcomeEnum,
} from "../../lib/db/schema";
import { TrainingSessionError } from "./types";

const textField = z.string().trim().min(1, "Must not be empty.");
const optionalText = textField.nullable().optional();
const uuidField = z.uuid();

const findingFields = {
  title: textField.max(255),
  category: textField.max(128),
  evidence: textField,
  evidenceState: z.enum(findingEvidenceStateEnum.enumValues),
  contextKind: z.enum(findingContextKindEnum.enumValues).nullable().optional(),
  contextValue: textField.max(255).nullable().optional(),
  importance: z.enum(findingImportanceEnum.enumValues),
  source: optionalText,
  notes: optionalText,
};

export const createFindingSchema = z.strictObject({
  ...findingFields,
  evidenceState: findingFields.evidenceState.default("observed"),
  importance: findingFields.importance.default("medium"),
});
export const updateFindingSchema = z.strictObject(findingFields).partial();

const hypothesisFields = {
  basedOnFindingId: uuidField.nullable().optional(),
  hypothesis: textField,
  reasoning: textField,
  expectedResult: textField,
  testApproach: textField,
  outcome: z.enum(hypothesisOutcomeEnum.enumValues),
};

export const createHypothesisSchema = z.strictObject({
  ...hypothesisFields,
  outcome: hypothesisFields.outcome.default("open"),
});
export const updateHypothesisSchema = z.strictObject(hypothesisFields).partial();

const attemptFields = {
  hypothesisId: uuidField.nullable().optional(),
  action: textField,
  notes: optionalText,
  result: optionalText,
  outcome: z.enum(attemptOutcomeEnum.enumValues),
};

export const createAttemptSchema = z.strictObject(attemptFields);
export const updateAttemptSchema = createAttemptSchema.partial();

export type CreateFindingInput = z.input<typeof createFindingSchema>;
export type UpdateFindingInput = z.input<typeof updateFindingSchema>;
export type CreateHypothesisInput = z.input<typeof createHypothesisSchema>;
export type UpdateHypothesisInput = z.input<typeof updateHypothesisSchema>;
export type CreateAttemptInput = z.input<typeof createAttemptSchema>;
export type UpdateAttemptInput = z.input<typeof updateAttemptSchema>;

export function parseEvidenceInput<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): z.output<Schema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const issue = result.error.issues[0];
  const field = issue.path.join(".") || "Input";
  throw new TrainingSessionError("invalid_input", `${field}: ${issue.message}`);
}

export function parseEvidenceId(value: string): string {
  return parseEvidenceInput(uuidField, value);
}

export function requireNonemptyUpdate(values: object): void {
  if (!Object.values(values).some((value) => value !== undefined)) {
    throw new TrainingSessionError("invalid_input", "Update must include at least one field.");
  }
}

export function validateFindingContextPair(finding: {
  contextKind?: string | null;
  contextValue?: string | null;
}): void {
  if ((finding.contextKind == null) !== (finding.contextValue == null)) {
    throw new TrainingSessionError(
      "invalid_input",
      "contextKind and contextValue must be provided or cleared together.",
    );
  }
}
