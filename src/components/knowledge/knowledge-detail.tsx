"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Info,
  ListChecks,
  Terminal,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { KnowledgeItem } from "@/modules/knowledge/types";

interface KnowledgeDetailProps {
  readonly item: KnowledgeItem;
  readonly allItems: readonly KnowledgeItem[];
  readonly onSelectSlug: (slug: string) => void;
}

type TabType = "overview" | "methodology" | "tools" | "cheatsheet" | "related";

export function KnowledgeDetail({
  item,
  allItems,
  onSelectSlug,
}: KnowledgeDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  const relatedItems = item.relatedSlugs
    .map((slug) => allItems.find((i) => i.slug === slug))
    .filter((i): i is KnowledgeItem => Boolean(i));

  const tabs: Array<{ id: TabType; label: string; count?: number }> = [
    { id: "overview", label: "Overview" },
    { id: "methodology", label: "Methodology", count: item.checks.length },
    { id: "tools", label: "Tools", count: item.tools.length },
    { id: "cheatsheet", label: "Cheatsheet", count: item.cheatsheet.length },
    { id: "related", label: "Related", count: relatedItems.length },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Top Banner / Detail Header */}
      <div className="border-b border-border bg-card/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-emerald-500/40 bg-emerald-500/10 font-mono text-[11px] uppercase tracking-wider text-emerald-300"
            >
              {item.category.replace("_", " ")}
            </Badge>
            <Badge
              variant="outline"
              className="border-border bg-muted/30 font-mono text-[11px] text-muted-foreground"
            >
              Phase: {item.targetPhase}
            </Badge>
            {item.sourcePlaybook && (
              <Badge
                variant="outline"
                className="border-sky-500/30 bg-sky-500/10 font-mono text-[11px] text-sky-400"
              >
                Playbook Registry (v{item.version ?? 1})
              </Badge>
            )}
          </div>
        </div>

        <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
          {item.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p>

        {/* Tab Navigation */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-border/80">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-1.5 pb-2.5 pt-1 font-mono text-xs font-medium transition-colors",
                  isActive
                    ? "text-emerald-400"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{tab.label}</span>
                {typeof tab.count === "number" && tab.count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 font-mono text-[10px]",
                      isActive
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 p-6">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6 max-w-4xl">
            {/* About Card */}
            <Card className="p-5 border-border bg-card">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-foreground/70" />
                <span>About</span>
              </h3>
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                {item.about}
              </p>
            </Card>

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tags & Classifications
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-border bg-muted/30 px-2 py-0.5 font-mono text-xs text-foreground/80"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Key Checks Summary */}
            {item.checks.length > 0 && (
              <Card className="p-5 border-border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ListChecks className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Key Verification Checks ({item.checks.length})</span>
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab("methodology")}
                    className="font-mono text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    View Full Methodology <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                  {item.checks.map((check) => (
                    <div
                      key={check.semanticKey}
                      className="flex items-start gap-2 rounded border border-border/50 bg-background/40 p-2.5"
                    >
                      <CheckCircle2
                        className={cn(
                          "h-4 w-4 shrink-0 mt-0.5",
                          check.priority === "required"
                            ? "text-rose-400"
                            : check.priority === "recommended"
                              ? "text-sky-400"
                              : "text-muted-foreground",
                        )}
                      />
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-mono text-xs font-medium text-foreground leading-snug">
                          {check.title}
                        </div>
                        <p className="line-clamp-2 text-[11px] text-muted-foreground">
                          {check.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Common Tools Preview */}
            {item.tools.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-foreground/70" />
                  <span>Common Tools</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {item.tools.map((tool) => (
                    <div
                      key={tool.name}
                      className="flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1 font-mono text-xs text-foreground"
                    >
                      <Terminal className="h-3 w-3 text-emerald-400" />
                      <span className="font-semibold">{tool.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ({tool.category})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* METHODOLOGY TAB */}
        {activeTab === "methodology" && (
          <div className="space-y-6 max-w-4xl">
            {/* Activation Rule Card */}
            {item.activationRuleExplanation && (
              <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
                <div className="flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-mono text-xs font-semibold text-emerald-300">
                      Dynamic Session Activation Rule
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.activationRuleExplanation}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Structured Checks List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                <span>Verification Checklist</span>
                <span>{item.checks.length} checks</span>
              </div>

              {item.checks.map((check, idx) => (
                <Card
                  key={check.semanticKey}
                  className="p-4 border-border bg-card space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-muted/40 font-mono text-xs font-semibold text-foreground/80">
                        {idx + 1}
                      </span>
                      <span className="font-mono text-xs font-bold text-foreground">
                        {check.title}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-[10px] uppercase",
                        check.priority === "required"
                          ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                          : check.priority === "recommended"
                            ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                            : "border-border bg-muted/30 text-muted-foreground",
                      )}
                    >
                      {check.priority}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed pl-7">
                    {check.description}
                  </p>

                  <div className="pl-7 pt-1 font-mono text-[10px] text-muted-foreground/60">
                    Key: {check.semanticKey}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TOOLS TAB */}
        {activeTab === "tools" && (
          <div className="space-y-4 max-w-4xl">
            {item.tools.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground">
                No specific tools cataloged for this entry.
              </p>
            ) : (
              item.tools.map((tool) => (
                <Card
                  key={tool.name}
                  className="p-5 border-border bg-card space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-emerald-400" />
                      <h4 className="font-mono text-sm font-bold text-foreground">
                        {tool.name}
                      </h4>
                      <Badge
                        variant="outline"
                        className="border-border bg-muted/20 font-mono text-[10px] text-muted-foreground"
                      >
                        {tool.category}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {tool.purpose}
                  </p>

                  {tool.commonCommands.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="font-mono text-[11px] text-muted-foreground">
                        Common Command Patterns:
                      </div>
                      {tool.commonCommands.map((cmd) => (
                        <pre
                          key={cmd}
                          className="rounded border border-border/80 bg-background/80 p-2 font-mono text-xs text-emerald-300 overflow-x-auto"
                        >
                          {cmd}
                        </pre>
                      ))}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {/* CHEATSHEET TAB */}
        {activeTab === "cheatsheet" && (
          <div className="space-y-4 max-w-4xl">
            {item.cheatsheet.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground">
                No cheatsheet snippets cataloged for this entry.
              </p>
            ) : (
              item.cheatsheet.map((entry, index) => (
                <Card
                  key={entry.title}
                  className="p-4 border-border bg-card space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {entry.title}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(entry.command, index)}
                      className="h-7 px-2 font-mono text-xs text-muted-foreground hover:text-foreground"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400 mr-1" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <pre className="rounded border border-border/80 bg-background/90 p-3 font-mono text-xs text-emerald-300 overflow-x-auto select-all">
                    {entry.command}
                  </pre>

                  {entry.description && (
                    <p className="text-xs text-muted-foreground">
                      {entry.description}
                    </p>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {/* RELATED TAB */}
        {activeTab === "related" && (
          <div className="space-y-4 max-w-4xl">
            {relatedItems.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground">
                No related topics configured.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {relatedItems.map((rel) => (
                  <button
                    key={rel.slug}
                    type="button"
                    onClick={() => onSelectSlug(rel.slug)}
                    className="flex flex-col items-start gap-1.5 rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-emerald-500/50 hover:bg-muted/20"
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-mono text-xs font-bold text-foreground">
                        {rel.title}
                      </span>
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] text-muted-foreground"
                      >
                        {rel.category.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {rel.subtitle}
                    </p>
                    <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1 pt-1">
                      Explore Playbook <ArrowRight className="h-3 w-3" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
