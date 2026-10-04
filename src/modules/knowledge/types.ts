import type {
  PlaybookCheckDefinition,
  PlaybookDefinition,
} from "../playbooks/types";

export type KnowledgeCategory =
  | "services"
  | "techniques"
  | "post_exploitation"
  | "concepts";

export interface ToolReference {
  readonly name: string;
  readonly purpose: string;
  readonly category: string;
  readonly commonCommands: readonly string[];
  readonly url?: string;
}

export interface CheatsheetEntry {
  readonly title: string;
  readonly command: string;
  readonly description?: string;
  readonly tags?: readonly string[];
}

export type KnowledgeCheck = PlaybookCheckDefinition;

export interface KnowledgeItem {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly about: string;
  readonly category: KnowledgeCategory;
  readonly targetPhase: string;
  readonly tags: readonly string[];
  readonly tools: readonly ToolReference[];
  readonly cheatsheet: readonly CheatsheetEntry[];
  readonly relatedSlugs: readonly string[];
  readonly checks: readonly KnowledgeCheck[];
  readonly activationRuleExplanation?: string;
  readonly playbookId?: string;
  readonly version?: number;
  readonly sourcePlaybook?: PlaybookDefinition;
}

export interface CategorySummary {
  readonly id: KnowledgeCategory;
  readonly label: string;
  readonly count: number;
}
