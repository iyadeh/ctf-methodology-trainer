export interface GeminiModelInfo {
  readonly id: string;
  readonly displayName: string;
  readonly description?: string;
  readonly isRecommended?: boolean;
}

export type AiModelOption =
  | "gemini-3.5-flash"
  | "gemini-3.5-flash-lite"
  | "gemini-3.1-pro-preview"
  | (string & {});


export type SpoilerLevelOption =
  | "methodology_only"
  | "directional"
  | "sub_objective";

export type HintBehaviorOption =
  | "progressive"
  | "strict"
  | "on_demand";

export type ThemeOption = "dark" | "light" | "system";
export type DensityOption = "comfortable" | "compact";

export interface AiSettings {
  readonly provider: "gemini";
  readonly model: string;
  readonly isConnected: boolean;
  readonly hasCustomKey: boolean;
  readonly maskedKey: string;
  readonly latencyMs?: number;
  readonly errorMessage?: string;
}

export interface TrainingDefaultsSettings {
  readonly frameworkSlug: string;
  readonly frameworkName: string;
  readonly defaultSpoilerLevel: SpoilerLevelOption;
  readonly hintBehavior: HintBehaviorOption;
}

export interface InterfaceSettings {
  readonly theme: ThemeOption;
  readonly density: DensityOption;
  readonly reducedMotion: boolean;
}

export interface StorageSettings {
  readonly isDbConnected: boolean;
  readonly totalSessions: number;
  readonly totalFindings: number;
  readonly totalGenerationRuns: number;
  readonly totalHintRecords: number;
  readonly estimatedCacheMb: number;
}

export interface AppSettings {
  readonly ai: AiSettings;
  readonly trainingDefaults: TrainingDefaultsSettings;
  readonly interface: InterfaceSettings;
  readonly storage: StorageSettings;
}

export interface TestAiConnectionResult {
  readonly ok: boolean;
  readonly latencyMs: number;
  readonly model: string;
  readonly error?: string;
}
