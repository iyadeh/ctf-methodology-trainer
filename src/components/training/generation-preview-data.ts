// Presentation fixtures only. These states never represent a generation run or a session.
export type GenerationPreviewState = "pending" | "processing" | "failed" | "ready";
export type PreviewStepStatus = "completed" | "in-progress" | "pending" | "failed";

export const generationPreviewSteps = [
  { title: "Document parsed", description: "Extract document text from the writeup." },
  { title: "Machine knowledge extracted", description: "Identify machine details while keeping solution knowledge hidden." },
  { title: "Attack path modeled", description: "Model the hidden solution and its dependencies." },
  { title: "Guide verified", description: "Check the generated knowledge for consistency." },
  { title: "Training ready", description: "Prepare the session for methodology-guided practice." },
] as const;

type PreviewSteps = readonly [PreviewStepStatus, PreviewStepStatus, PreviewStepStatus, PreviewStepStatus, PreviewStepStatus];

export const generationPreviewPresets: Record<GenerationPreviewState, {
  label: string;
  title: string;
  statuses: PreviewSteps;
}> = {
  pending: {
    label: "Pending",
    title: "Preparing Training",
    statuses: ["pending", "pending", "pending", "pending", "pending"],
  },
  processing: {
    label: "In Progress",
    title: "Processing Writeup",
    statuses: ["completed", "completed", "in-progress", "pending", "pending"],
  },
  failed: {
    label: "Failed",
    title: "Generation failed",
    statuses: ["completed", "completed", "failed", "pending", "pending"],
  },
  ready: {
    label: "Ready",
    title: "Training Ready",
    statuses: ["completed", "completed", "completed", "completed", "completed"],
  },
};
