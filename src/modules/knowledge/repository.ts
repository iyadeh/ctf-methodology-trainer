import { getAllPlaybooks } from "../playbooks/registry";
import type { PlaybookDefinition } from "../playbooks/types";
import {
  playbookEnrichments,
  standaloneConcepts,
  standalonePostExploitation,
  standaloneTechniques,
} from "./metadata";
import type { CategorySummary, KnowledgeCategory, KnowledgeItem } from "./types";

function mapPlaybookCategoryToKnowledgeCategory(
  playbook: PlaybookDefinition,
): KnowledgeCategory {
  if (playbook.category === "post_exploitation") {
    return "post_exploitation";
  }
  return "services";
}

/**
 * Builds a KnowledgeItem from a PlaybookDefinition in PlaybookRegistry,
 * adhering to AGENTS.md Rule 33 (single source of truth for methodology).
 */
function buildKnowledgeItemFromPlaybook(
  playbook: PlaybookDefinition,
): KnowledgeItem {
  const enrichment = playbookEnrichments[playbook.slug];
  const category = mapPlaybookCategoryToKnowledgeCategory(playbook);

  return {
    id: `kb-pb-${playbook.id}`,
    slug: playbook.slug,
    title: playbook.name,
    subtitle:
      enrichment?.subtitle ||
      playbook.description ||
      "Methodology checks and commands",
    description: playbook.description,
    about:
      enrichment?.about ||
      playbook.description ||
      "Comprehensive systematic methodology and structured verification checks.",
    category,
    targetPhase: playbook.targetPhase,
    tags: enrichment?.tags || [
      playbook.category === "network_service" ? "Services" : "Post Exploitation",
      playbook.targetPhase,
    ],
    tools: enrichment?.tools || [],
    cheatsheet: enrichment?.cheatsheet || [],
    relatedSlugs: enrichment?.relatedSlugs || [],
    // CRITICAL: Reuses playbook checks directly from PlaybookRegistry
    checks: playbook.checks,
    activationRuleExplanation:
      enrichment?.activationRuleExplanation ||
      "Activates based on confirmed session context.",
    playbookId: playbook.id,
    version: playbook.version,
    sourcePlaybook: playbook,
  };
}

let cachedKnowledgeItems: readonly KnowledgeItem[] | null = null;

export function getAllKnowledgeItems(): readonly KnowledgeItem[] {
  if (cachedKnowledgeItems) {
    return cachedKnowledgeItems;
  }

  // 1. Convert all playbooks from the Playbook Registry
  const playbookItems = getAllPlaybooks().map(buildKnowledgeItemFromPlaybook);

  // 2. Combine with standalone techniques, post exploitation topics, and concepts
  const allItems: KnowledgeItem[] = [
    ...playbookItems,
    ...standaloneTechniques,
    ...standalonePostExploitation,
    ...standaloneConcepts,
  ];

  cachedKnowledgeItems = Object.freeze(allItems);
  return cachedKnowledgeItems;
}

export function getKnowledgeItemBySlug(slug: string): KnowledgeItem | undefined {
  const normalized = slug.trim().toLowerCase();
  return getAllKnowledgeItems().find(
    (item) => item.slug.toLowerCase() === normalized,
  );
}

export function getCategorySummaries(): readonly CategorySummary[] {
  const items = getAllKnowledgeItems();
  const counts: Record<KnowledgeCategory, number> = {
    services: 0,
    techniques: 0,
    post_exploitation: 0,
    concepts: 0,
  };

  for (const item of items) {
    counts[item.category] = (counts[item.category] || 0) + 1;
  }

  return [
    { id: "services", label: "Services", count: counts.services },
    { id: "techniques", label: "Techniques", count: counts.techniques },
    {
      id: "post_exploitation",
      label: "Post Exploitation",
      count: counts.post_exploitation,
    },
    { id: "concepts", label: "Concepts", count: counts.concepts },
  ];
}

export function getAllTags(): readonly string[] {
  const items = getAllKnowledgeItems();
  const tagSet = new Set<string>();

  for (const item of items) {
    for (const tag of item.tags) {
      tagSet.add(tag);
    }
  }

  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

export interface SearchKnowledgeOptions {
  readonly query?: string;
  readonly category?: string;
  readonly tag?: string;
}

export function searchKnowledgeItems(
  options: SearchKnowledgeOptions = {},
): readonly KnowledgeItem[] {
  const { query, category, tag } = options;
  const items = getAllKnowledgeItems();

  const normalizedQuery = query?.trim().toLowerCase();
  const normalizedCategory = category?.trim().toLowerCase();
  const normalizedTag = tag?.trim().toLowerCase();

  return items.filter((item) => {
    // 1. Filter by category
    if (
      normalizedCategory &&
      normalizedCategory !== "all" &&
      item.category.toLowerCase() !== normalizedCategory
    ) {
      return false;
    }

    // 2. Filter by tag
    if (normalizedTag && normalizedTag !== "all") {
      const hasTag = item.tags.some(
        (t) => t.toLowerCase() === normalizedTag,
      );
      if (!hasTag) {
        return false;
      }
    }

    // 3. Search query matching
    if (normalizedQuery) {
      const matchTitle = item.title.toLowerCase().includes(normalizedQuery);
      const matchSlug = item.slug.toLowerCase().includes(normalizedQuery);
      const matchSubtitle = item.subtitle.toLowerCase().includes(normalizedQuery);
      const matchDesc = item.description.toLowerCase().includes(normalizedQuery);
      const matchAbout = item.about.toLowerCase().includes(normalizedQuery);
      const matchTag = item.tags.some((t) =>
        t.toLowerCase().includes(normalizedQuery),
      );
      const matchTools = item.tools.some((tool) =>
        tool.name.toLowerCase().includes(normalizedQuery) ||
        tool.purpose.toLowerCase().includes(normalizedQuery),
      );
      const matchChecks = item.checks.some(
        (check) =>
          check.title.toLowerCase().includes(normalizedQuery) ||
          check.description.toLowerCase().includes(normalizedQuery) ||
          check.semanticKey.toLowerCase().includes(normalizedQuery),
      );

      if (
        !matchTitle &&
        !matchSlug &&
        !matchSubtitle &&
        !matchDesc &&
        !matchAbout &&
        !matchTag &&
        !matchTools &&
        !matchChecks
      ) {
        return false;
      }
    }

    return true;
  });
}
