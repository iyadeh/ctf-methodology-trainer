"use client";

import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CategorySummary } from "@/modules/knowledge/types";

interface KnowledgeFilterBarProps {
  readonly searchQuery: string;
  readonly onSearchChange: (query: string) => void;
  readonly typeFilter: string;
  readonly onTypeFilterChange: (type: string) => void;
  readonly activeTag: string;
  readonly onTagSelect: (tag: string) => void;
  readonly categorySummaries: readonly CategorySummary[];
}

const standardPills = [
  { id: "all", label: "All" },
  { id: "services", label: "Services" },
  { id: "techniques", label: "Techniques" },
  { id: "post_exploitation", label: "Post Exploitation" },
  { id: "concepts", label: "Concepts" },
  { id: "enumeration", label: "Enumeration" },
  { id: "privesc", label: "Privesc" },
  { id: "lateral-movement", label: "Lateral Movement" },
  { id: "web", label: "Web" },
  { id: "windows", label: "Windows" },
  { id: "linux", label: "Linux" },
];

export function KnowledgeFilterBar({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  activeTag,
  onTagSelect,
  categorySummaries,
}: KnowledgeFilterBarProps) {
  return (
    <div className="space-y-3 border-b border-border bg-card/30 px-6 py-4">
      {/* Top row: Search input + Type Dropdown */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search the knowledge base... (tools, techniques, commands, checks)"
            className="h-9 pl-9 pr-8 font-mono text-xs bg-background/80"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Type filter dropdown */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Type:</span>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Content</option>
            {categorySummaries.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label} ({cat.count})
              </option>
            ))}
          </select>
          {(searchQuery || typeFilter !== "all" || activeTag !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSearchChange("");
                onTypeFilterChange("all");
                onTagSelect("all");
              }}
              className="h-9 font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Bottom row: Category & Topic Pills */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
        {standardPills.map((pill) => {
          const isSelected = activeTag === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => onTagSelect(pill.id)}
              className={cn(
                "rounded-md border px-2.5 py-1 font-mono text-xs transition-colors",
                isSelected
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-medium"
                  : "border-border bg-card/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              {pill.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
