export type PlaybookPriority = "required" | "recommended" | "suggested";

export type PlaybookCategory = "network_service" | "post_exploitation" | "generic";

export type PlaybookTargetPhase =
  | "reconnaissance"
  | "threat-modeling"
  | "vulnerability-analysis"
  | "exploitation"
  | "post-exploitation"
  | "reporting";

export interface PlaybookCheckDefinition {
  readonly semanticKey: string;
  readonly title: string;
  readonly description: string;
  readonly priority: PlaybookPriority;
  readonly sortOrder: number;
}

export interface PlaybookActivationRule {
  /**
   * All keys in this array must be present in the active context.
   */
  readonly requireAll?: readonly string[];
  /**
   * At least one key in this array must be present in the active context.
   */
  readonly requireAny?: readonly string[];
  /**
   * None of the keys in this array may be present in the active context.
   */
  readonly requireNone?: readonly string[];
}

export interface PlaybookDefinition {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly version: number;
  readonly category: PlaybookCategory;
  readonly targetPhase: PlaybookTargetPhase;
  readonly activationRule: PlaybookActivationRule;
  readonly associatedServiceKeys?: readonly string[];
  readonly isGenericFallback?: boolean;
  readonly checks: readonly PlaybookCheckDefinition[];
}

export interface ResolvedPlaybook {
  readonly playbook: PlaybookDefinition;
  readonly triggeredByServiceKey?: string;
  readonly isFallback: boolean;
}

export interface ResolvePlaybooksResult {
  readonly matched: readonly ResolvedPlaybook[];
}
