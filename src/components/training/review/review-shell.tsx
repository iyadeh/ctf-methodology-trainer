"use client";

import { useState } from "react";
import {
  Clock,
  FileText,
  GitCompare,
  Layers,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionReviewData } from "@/modules/review/types";
import { ReviewHeader } from "./review-header";
import { OverviewTab } from "./overview-tab";
import { UserPathTab } from "./user-path-tab";
import { ComparisonTab } from "./comparison-tab";
import { MethodologyTab } from "./methodology-tab";
import { NotesTab } from "./notes-tab";

interface ReviewShellProps {
  readonly review: SessionReviewData;
}

type ReviewTabType = "overview" | "your-path" | "comparison" | "methodology" | "notes";

export function ReviewShell({ review }: ReviewShellProps) {
  const [activeTab, setActiveTab] = useState<ReviewTabType>("overview");

  const tabs: Array<{
    id: ReviewTabType;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: string | number;
  }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    {
      id: "your-path",
      label: "Your Path",
      icon: Clock,
      badge: review.userPath.length,
    },
    {
      id: "comparison",
      label: "Comparison",
      icon: GitCompare,
      badge: review.comparison.length > 0 ? review.comparison.length : undefined,
    },
    {
      id: "methodology",
      label: "Methodology",
      icon: Layers,
      badge: `${review.metrics.phaseGateCompliance}%`,
    },
    {
      id: "notes",
      label: "Notes",
      icon: FileText,
      badge: review.notes.length > 0 ? review.notes.length : undefined,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* 1. Review Header */}
      <ReviewHeader session={review.session} />

      {/* 2. Navigation Tabs */}
      <div className="border-b border-border bg-card/60 px-4 sm:px-6">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 font-mono text-xs font-medium rounded transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded text-[10px] font-semibold",
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 3. Tab Content Area */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
        {activeTab === "overview" && <OverviewTab review={review} />}
        {activeTab === "your-path" && <UserPathTab review={review} />}
        {activeTab === "comparison" && <ComparisonTab review={review} />}
        {activeTab === "methodology" && <MethodologyTab review={review} />}
        {activeTab === "notes" && <NotesTab review={review} />}
      </main>
    </div>
  );
}
