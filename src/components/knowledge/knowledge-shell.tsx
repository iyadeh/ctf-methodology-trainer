"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CategorySummary,
  KnowledgeItem,
} from "@/modules/knowledge/types";
import { KnowledgeHeader } from "./knowledge-header";
import { KnowledgeFilterBar } from "./knowledge-filter-bar";
import { KnowledgeNavigator } from "./knowledge-navigator";
import { KnowledgeDetail } from "./knowledge-detail";

interface KnowledgeShellProps {
  readonly allItems: readonly KnowledgeItem[];
  readonly categorySummaries: readonly CategorySummary[];
  readonly initialSlug?: string;
  readonly initialCategory?: string;
  readonly initialTag?: string;
  readonly formattedDate?: string;
}

export function KnowledgeShell({
  allItems,
  categorySummaries,
  initialSlug,
  initialCategory,
  initialTag,
  formattedDate,
}: KnowledgeShellProps) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState(initialCategory || "all");
  const [activeTag, setActiveTag] = useState(initialTag || "all");

  // Determine starting slug
  const defaultSlug = useMemo(() => {
    if (initialSlug && allItems.some((i) => i.slug.toLowerCase() === initialSlug.toLowerCase())) {
      return initialSlug;
    }
    const httpItem = allItems.find((i) => i.slug === "http");
    return httpItem ? httpItem.slug : (allItems[0]?.slug ?? "");
  }, [initialSlug, allItems]);

  const [selectedSlug, setSelectedSlug] = useState(defaultSlug);

  // Filter items dynamically
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const cat = typeFilter.trim().toLowerCase();
    const tag = activeTag.trim().toLowerCase();

    return allItems.filter((item) => {
      // 1. Type dropdown filter
      if (cat !== "all" && item.category.toLowerCase() !== cat) {
        return false;
      }

      // 2. Active tag/pill filter
      if (tag !== "all") {
        // Tag could match category
        const matchCategory = item.category.toLowerCase() === tag;
        // Or item tags
        const matchTag = item.tags.some((t) => t.toLowerCase() === tag);
        if (!matchCategory && !matchTag) {
          return false;
        }
      }

      // 3. Search query filter
      if (q) {
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSlug = item.slug.toLowerCase().includes(q);
        const matchSubtitle = item.subtitle.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchAbout = item.about.toLowerCase().includes(q);
        const matchTag = item.tags.some((t) => t.toLowerCase().includes(q));
        const matchTools = item.tools.some(
          (tool) =>
            tool.name.toLowerCase().includes(q) ||
            tool.purpose.toLowerCase().includes(q),
        );
        const matchChecks = item.checks.some(
          (check) =>
            check.title.toLowerCase().includes(q) ||
            check.description.toLowerCase().includes(q) ||
            check.semanticKey.toLowerCase().includes(q),
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
  }, [allItems, searchQuery, typeFilter, activeTag]);

  // Selected knowledge item
  const selectedItem = useMemo(() => {
    const found = filteredItems.find((i) => i.slug === selectedSlug);
    if (found) return found;
    // If current selected item was filtered out, fallback to first matching or first item in all
    return filteredItems[0] || allItems.find((i) => i.slug === selectedSlug) || allItems[0];
  }, [filteredItems, selectedSlug, allItems]);

  const handleSelectSlug = (slug: string) => {
    setSelectedSlug(slug);
    // Optionally update URL query param
    router.replace(`/knowledge?item=${encodeURIComponent(slug)}`, {
      scroll: false,
    });
  };

  const isFiltered = Boolean(searchQuery.trim() || typeFilter !== "all" || activeTag !== "all");

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] min-h-0 bg-background overflow-hidden">
      {/* 1. Page Header */}
      <KnowledgeHeader totalItems={allItems.length} formattedDate={formattedDate} />

      {/* 2. Filter Bar */}
      <KnowledgeFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        activeTag={activeTag}
        onTagSelect={setActiveTag}
        categorySummaries={categorySummaries}
      />

      {/* 3. Main Workspace: Navigator (Left) + Detail Panel (Right) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Navigator Panel */}
        <div className="w-80 md:w-96 shrink-0 h-full">
          <KnowledgeNavigator
            items={filteredItems}
            selectedSlug={selectedItem ? selectedItem.slug : selectedSlug}
            onSelectSlug={handleSelectSlug}
            isFiltered={isFiltered}
          />
        </div>

        {/* Right Detail Panel */}
        <div className="flex-1 h-full min-w-0 bg-background/50">
          {selectedItem ? (
            <KnowledgeDetail
              key={selectedItem.slug}
              item={selectedItem}
              allItems={allItems}
              onSelectSlug={handleSelectSlug}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <p className="font-mono text-sm text-muted-foreground">
                Select an item from the navigator to view details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
