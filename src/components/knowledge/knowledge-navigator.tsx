"use client";

import {
  Compass,
  Globe,
  Search,
  Terminal,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { KnowledgeCategory, KnowledgeItem } from "@/modules/knowledge/types";

interface KnowledgeNavigatorProps {
  readonly items: readonly KnowledgeItem[];
  readonly selectedSlug: string;
  readonly onSelectSlug: (slug: string) => void;
  readonly isFiltered: boolean;
}

const categoryIcons: Record<KnowledgeCategory, React.ComponentType<{ className?: string }>> = {
  services: Globe,
  techniques: Wrench,
  post_exploitation: Terminal,
  concepts: Compass,
};

const categoryTitles: Record<KnowledgeCategory, string> = {
  services: "Services",
  techniques: "Techniques",
  post_exploitation: "Post Exploitation",
  concepts: "Concepts",
};

export function KnowledgeNavigator({
  items,
  selectedSlug,
  onSelectSlug,
  isFiltered,
}: KnowledgeNavigatorProps) {
  // If list is empty
  if (items.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-6 text-center border-r border-border bg-card/20">
        <Search className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="font-mono text-xs font-semibold text-foreground">
          No matching knowledge items
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Try adjusting your search terms or clearing the active filters.
        </p>
      </div>
    );
  }

  // If filtered, show a flat list of matching items
  if (isFiltered) {
    return (
      <div className="h-full overflow-y-auto border-r border-border bg-card/10 p-3 space-y-1">
        <div className="px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>Search Results</span>
          <span>{items.length} items</span>
        </div>

        {items.map((item) => (
          <NavigatorItem
            key={item.slug}
            item={item}
            isSelected={selectedSlug === item.slug}
            onSelect={() => onSelectSlug(item.slug)}
          />
        ))}
      </div>
    );
  }

  // Otherwise, group by category
  const categories: KnowledgeCategory[] = [
    "services",
    "techniques",
    "post_exploitation",
    "concepts",
  ];

  return (
    <div className="h-full overflow-y-auto border-r border-border bg-card/10 p-3 space-y-4">
      {categories.map((category) => {
        const catItems = items.filter((i) => i.category === category);
        if (catItems.length === 0) return null;
        const Icon = categoryIcons[category];

        return (
          <div key={category} className="space-y-1.5">
            {/* Category header */}
            <div className="flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-foreground/70" />
                <span>{categoryTitles[category]}</span>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                {catItems.length}
              </span>
            </div>

            {/* Category items */}
            <div className="space-y-1">
              {catItems.map((item) => (
                <NavigatorItem
                  key={item.slug}
                  item={item}
                  isSelected={selectedSlug === item.slug}
                  onSelect={() => onSelectSlug(item.slug)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface NavigatorItemProps {
  readonly item: KnowledgeItem;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
}

function NavigatorItem({ item, isSelected, onSelect }: NavigatorItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full flex-col items-start gap-1 rounded-md border p-2.5 text-left transition-all",
        isSelected
          ? "border-emerald-500/50 bg-emerald-500/10 text-foreground shadow-sm"
          : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground",
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span
          className={cn(
            "font-mono text-xs font-semibold truncate",
            isSelected ? "text-emerald-300" : "text-foreground group-hover:text-foreground",
          )}
        >
          {item.title}
        </span>
        {item.checks.length > 0 && (
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground/80">
            {item.checks.length} checks
          </span>
        )}
      </div>

      <p className="line-clamp-1 text-[11px] text-muted-foreground">
        {item.subtitle}
      </p>

      <div className="flex flex-wrap items-center gap-1 pt-0.5">
        {item.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="rounded border border-border/60 bg-background/50 px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground/90"
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}
