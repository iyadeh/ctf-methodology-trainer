import type { z } from "zod";

export type AIErrorCode =
  | "missing_api_key"
  | "rate_limit_exceeded"
  | "service_unavailable"
  | "invalid_ai_output"
  | "generation_failed";

export interface MultimodalPart {
  readonly inlineData: {
    readonly data: string; // Base64 encoded data
    readonly mimeType: string;
  };
}

export type AIContentPart = string | MultimodalPart;
export type AIContentInput = string | AIContentPart[];

export interface GenerateStructuredAIOptions<T> {
  readonly contents: AIContentInput;
  readonly schema: z.ZodType<T>;
  readonly systemInstruction?: string;
  readonly model?: string;
  readonly temperature?: number;
}
