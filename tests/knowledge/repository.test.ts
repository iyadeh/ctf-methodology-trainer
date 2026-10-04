import { describe, expect, it } from "vitest";
import {
  getAllKnowledgeItems,
  getCategorySummaries,
  getKnowledgeItemBySlug,
  searchKnowledgeItems,
} from "../../src/modules/knowledge";
import { getAllPlaybooks } from "../../src/modules/playbooks";

describe("Stage 25 — Knowledge Base Repository & Playbook Reuse", () => {
  it("includes all playbooks defined in the Playbook Registry (AGENTS.md Rule 33)", () => {
    const registryPlaybooks = getAllPlaybooks();
    const knowledgeItems = getAllKnowledgeItems();

    expect(registryPlaybooks.length).toBeGreaterThan(0);

    for (const playbook of registryPlaybooks) {
      const kbItem = knowledgeItems.find((item) => item.slug === playbook.slug);
      expect(kbItem).toBeDefined();
      expect(kbItem?.title).toBe(playbook.name);
      expect(kbItem?.checks).toEqual(playbook.checks); // EXACT CHECK REUSE
      expect(kbItem?.sourcePlaybook?.id).toBe(playbook.id);
    }
  });

  it("includes standalone techniques, post-exploitation topics, and concepts", () => {
    const items = getAllKnowledgeItems();
    const slugs = items.map((i) => i.slug);

    // Techniques
    expect(slugs).toContain("content-discovery");
    expect(slugs).toContain("vhost-discovery");
    expect(slugs).toContain("credential-analysis");

    // Post Exploitation
    expect(slugs).toContain("sudo-privesc");
    expect(slugs).toContain("suid-privesc");
    expect(slugs).toContain("linux-capabilities");

    // Concepts
    expect(slugs).toContain("enumeration");
    expect(slugs).toContain("privilege-escalation");
    expect(slugs).toContain("lateral-movement");
  });

  it("calculates accurate category summaries", () => {
    const summaries = getCategorySummaries();
    expect(summaries.length).toBe(4);

    const services = summaries.find((s) => s.id === "services");
    const techniques = summaries.find((s) => s.id === "techniques");
    const postExploit = summaries.find((s) => s.id === "post_exploitation");
    const concepts = summaries.find((s) => s.id === "concepts");

    expect(services?.count).toBeGreaterThan(0);
    expect(techniques?.count).toBeGreaterThan(0);
    expect(postExploit?.count).toBeGreaterThan(0);
    expect(concepts?.count).toBeGreaterThan(0);

    const totalCount =
      (services?.count ?? 0) +
      (techniques?.count ?? 0) +
      (postExploit?.count ?? 0) +
      (concepts?.count ?? 0);
    expect(totalCount).toBe(getAllKnowledgeItems().length);
  });

  it("retrieves individual items by slug case-insensitively", () => {
    const http = getKnowledgeItemBySlug("http");
    expect(http).toBeDefined();
    expect(http?.slug).toBe("http");
    expect(http?.category).toBe("services");
    expect(http?.tools.length).toBeGreaterThan(0);
    expect(http?.cheatsheet.length).toBeGreaterThan(0);

    const httpUpper = getKnowledgeItemBySlug("HTTP");
    expect(httpUpper).toEqual(http);

    const unknown = getKnowledgeItemBySlug("non-existent-slug-xyz");
    expect(unknown).toBeUndefined();
  });

  it("searches and filters knowledge items accurately", () => {
    // 1. Text search
    const resultsFuzz = searchKnowledgeItems({ query: "fuzz" });
    expect(resultsFuzz.length).toBeGreaterThan(0);
    expect(
      resultsFuzz.some(
        (i) => i.slug === "content-discovery" || i.slug === "http",
      ),
    ).toBe(true);

    // 2. Category filter
    const servicesOnly = searchKnowledgeItems({ category: "services" });
    expect(servicesOnly.every((i) => i.category === "services")).toBe(true);

    // 3. Tag filter
    const webOnly = searchKnowledgeItems({ tag: "Web" });
    expect(
      webOnly.every((i) => i.tags.some((t) => t.toLowerCase() === "web")),
    ).toBe(true);

    // 4. Combined
    const combined = searchKnowledgeItems({
      query: "apache",
      category: "services",
    });
    // Shouldn't crash and should be an array
    expect(Array.isArray(combined)).toBe(true);
  });

  it("ensures related slugs reference valid knowledge base items", () => {
    const allItems = getAllKnowledgeItems();
    const validSlugs = new Set(allItems.map((i) => i.slug));

    for (const item of allItems) {
      for (const related of item.relatedSlugs) {
        expect(
          validSlugs.has(related),
          `Item '${item.slug}' has invalid related slug '${related}'`,
        ).toBe(true);
      }
    }
  });
});
