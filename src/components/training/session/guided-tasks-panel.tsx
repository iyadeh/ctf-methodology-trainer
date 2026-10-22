"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  HelpCircle,
  Lightbulb,
  Lock,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SessionMilestoneRecord } from "@/modules/training/types";
import { submitMilestoneAnswerAction } from "@/app/training/[sessionId]/actions";

export const PTES_PHASE_ORDER = [
  { key: "reconnaissance", name: "Reconnaissance", number: "01", short: "Recon" },
  { key: "threat-modeling", name: "Threat Modeling", number: "02", short: "Threat" },
  { key: "vulnerability-analysis", name: "Vulnerability Analysis", number: "03", short: "Vuln Analysis" },
  { key: "exploitation", name: "Exploitation", number: "04", short: "Exploit" },
  { key: "post-exploitation", name: "Post Exploitation", number: "05", short: "Post Exploit" },
  { key: "reporting", name: "Reporting", number: "06", short: "Report" },
] as const;

export function normalizeMilestonePhase(rawPhase: string): string {
  const p = (rawPhase || "").toLowerCase().replace(/_/g, "-").trim();
  if (p === "scanning" || p === "recon" || p === "intel" || p === "intelligence-gathering") {
    return "reconnaissance";
  }
  if (p === "threat-modeling" || p === "modeling") {
    return "threat-modeling";
  }
  if (p === "vuln" || p === "vulnerability" || p === "vulnerability-analysis" || p === "vuln-analysis") {
    return "vulnerability-analysis";
  }
  if (p === "exploit" || p === "exploitation") {
    return "exploitation";
  }
  if (p === "post-exploit" || p === "post-exploitation" || p === "privesc") {
    return "post-exploitation";
  }
  if (p === "report" || p === "reporting") {
    return "reporting";
  }
  return p;
}

export function getPhaseDisplayName(rawPhase: string): string {
  const norm = normalizeMilestonePhase(rawPhase);
  const found = PTES_PHASE_ORDER.find((p) => p.key === norm);
  if (found) {
    return `Phase ${found.number}: ${found.name}`;
  }
  return rawPhase.charAt(0).toUpperCase() + rawPhase.slice(1).replace(/[-_]/g, " ");
}

interface GuidedTasksPanelProps {
  readonly sessionId: string;
  readonly milestones: readonly SessionMilestoneRecord[];
  readonly currentPhaseKey?: string | null;
  readonly viewedPhaseKey?: string | null;
  readonly isCompleted?: boolean;
  readonly onConsultMentor?: (query: string, focusTitle?: string) => void;
}

type StatusFilterType = "all" | "unlocked" | "completed";

export function GuidedTasksPanel({
  sessionId,
  milestones,
  currentPhaseKey,
  viewedPhaseKey,
  isCompleted = false,
  onConsultMentor,
}: GuidedTasksPanelProps) {
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<StatusFilterType>("all");
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [taskErrors, setTaskErrors] = useState<Record<string, string | null>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const inProgressCount = milestones.filter((m) => m.status === "unlocked").length;
  const progressPercent =
    milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  // Phase task distribution counts
  const phaseCounts = useMemo(() => {
    const map: Record<string, { total: number; completed: number }> = {};
    for (const m of milestones) {
      const norm = normalizeMilestonePhase(m.phase);
      if (!map[norm]) {
        map[norm] = { total: 0, completed: 0 };
      }
      map[norm].total += 1;
      if (m.status === "completed") {
        map[norm].completed += 1;
      }
    }
    return map;
  }, [milestones]);

  // Normalized active/viewed phase keys
  const normActivePhaseKey = currentPhaseKey ? normalizeMilestonePhase(currentPhaseKey) : null;
  const normViewedPhaseKey = viewedPhaseKey ? normalizeMilestonePhase(viewedPhaseKey) : null;

  // Filter tasks by phase and status
  const visibleMilestones = useMemo(() => {
    return milestones.filter((m) => {
      const normPhase = normalizeMilestonePhase(m.phase);

      // Phase filter
      if (selectedPhaseFilter !== "all" && normPhase !== selectedPhaseFilter) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter === "unlocked" && m.status !== "unlocked") {
        return false;
      }
      if (selectedStatusFilter === "completed" && m.status !== "completed") {
        return false;
      }

      return true;
    });
  }, [milestones, selectedPhaseFilter, selectedStatusFilter]);

  const handleInputChange = (milestoneId: string, value: string) => {
    setUserInputs((prev) => ({ ...prev, [milestoneId]: value }));
    if (taskErrors[milestoneId]) {
      setTaskErrors((prev) => ({ ...prev, [milestoneId]: null }));
    }
  };

  const handleSubmit = (milestone: SessionMilestoneRecord) => {
    const answer = (userInputs[milestone.id] || "").trim();
    if (!answer) return;

    setSubmittingTaskId(milestone.id);
    setTaskErrors((prev) => ({ ...prev, [milestone.id]: null }));

    startTransition(async () => {
      const res = await submitMilestoneAnswerAction(sessionId, milestone.id, answer);
      if (!res.ok) {
        setTaskErrors((prev) => ({
          ...prev,
          [milestone.id]: res.error || "Incorrect answer. Check your evidence or format.",
        }));
      } else {
        setUserInputs((prev) => ({ ...prev, [milestone.id]: "" }));
      }
      setSubmittingTaskId(null);
    });
  };

  const toggleHint = (milestoneId: string) => {
    setRevealedHints((prev) => ({ ...prev, [milestoneId]: !prev[milestoneId] }));
  };

  const activePhaseObj = PTES_PHASE_ORDER.find((p) => p.key === selectedPhaseFilter);
  const isFiltering = selectedPhaseFilter !== "all" || selectedStatusFilter !== "all";

  return (
    <div className="space-y-6 p-4 sm:p-6 w-full">
      {/* Header & Overall Progression */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Guided Milestone Tasks</span>
            </h2>
            <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
              {completedCount} / {milestones.length} Completed
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Solve checkpoint tasks step-by-step. Each confirmed answer unlocks the next objective.
          </p>
        </div>

        {/* Quick status counters */}
        <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
          <Badge variant="outline" className="border-border text-muted-foreground">
            {inProgressCount} in progress
          </Badge>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-950/20">
            {completedCount} completed
          </Badge>
        </div>
      </div>

      {/* Progression Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
          <span>Overall Progression</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Filter Control Bar: Phase Pills and Status Filter */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/40 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">Filter by Phase:</span>
          </div>

          {isFiltering && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedPhaseFilter("all");
                setSelectedStatusFilter("all");
              }}
              className="h-6 text-[11px] font-mono text-muted-foreground hover:text-foreground gap-1 px-2"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset filter</span>
            </Button>
          )}
        </div>

        {/* Phase Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedPhaseFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-md font-mono text-xs transition-colors flex items-center gap-1.5 border",
              selectedPhaseFilter === "all"
                ? "bg-primary text-primary-foreground font-semibold border-primary shadow-xs"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground border-border/60",
            )}
          >
            <span>All Phases</span>
            <span
              className={cn(
                "rounded px-1.5 py-0.2 text-[10px]",
                selectedPhaseFilter === "all" ? "bg-black/20 text-white" : "bg-muted text-muted-foreground",
              )}
            >
              {milestones.length}
            </span>
          </button>

          {PTES_PHASE_ORDER.map((phase) => {
            const countInfo = phaseCounts[phase.key];
            const hasTasks = Boolean(countInfo && countInfo.total > 0);
            const isActivePhase = normActivePhaseKey === phase.key;
            const isViewedPhase = normViewedPhaseKey === phase.key;
            const isSelected = selectedPhaseFilter === phase.key;

            return (
              <button
                key={phase.key}
                type="button"
                onClick={() => setSelectedPhaseFilter(phase.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md font-mono text-xs transition-colors flex items-center gap-1.5 border",
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold border-primary shadow-xs"
                    : hasTasks
                      ? "bg-card text-foreground hover:bg-muted/50 border-border/80"
                      : "bg-muted/10 text-muted-foreground/60 border-border/30 hover:bg-muted/30 hover:text-muted-foreground",
                )}
              >
                <span>
                  {phase.number}. {phase.short}
                </span>

                {hasTasks && (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.2 text-[10px]",
                      isSelected
                        ? "bg-black/20 text-white"
                        : countInfo.completed === countInfo.total
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {countInfo.completed}/{countInfo.total}
                  </span>
                )}

                {isActivePhase && (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      isSelected ? "bg-white" : "bg-primary",
                    )}
                    title="Active Phase in current session"
                  />
                )}
                {!isActivePhase && isViewedPhase && (
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0 bg-blue-400"
                    title="Phase currently selected in stepper"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Secondary Filter: Status Filter (All / In Progress / Completed) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5 mt-1 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Status:</span>
            <div className="inline-flex rounded-md border border-border bg-background/50 p-0.5">
              <button
                type="button"
                onClick={() => setSelectedStatusFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded text-xs transition-colors",
                  selectedStatusFilter === "all"
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter("unlocked")}
                className={cn(
                  "px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1",
                  selectedStatusFilter === "unlocked"
                    ? "bg-primary/20 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>In Progress</span>
                {inProgressCount > 0 && <span>({inProgressCount})</span>}
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter("completed")}
                className={cn(
                  "px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1",
                  selectedStatusFilter === "completed"
                    ? "bg-emerald-500/20 text-emerald-400 font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>Completed</span>
                {completedCount > 0 && <span>({completedCount})</span>}
              </button>
            </div>
          </div>

          <div className="text-muted-foreground text-[11px]">
            Showing <span className="font-semibold text-foreground">{visibleMilestones.length}</span> of {milestones.length} tasks
          </div>
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-4 w-full">
        {visibleMilestones.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center flex flex-col items-center gap-3">
            <HelpCircle className="h-8 w-8 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                No milestone tasks found for {activePhaseObj ? `${activePhaseObj.number} — ${activePhaseObj.name}` : "the selected filter"}.
              </p>
              <p className="text-xs text-muted-foreground max-w-md">
                There are currently no checkpoint tasks matching this phase or status filter. Click below to view all available tasks.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPhaseFilter("all");
                setSelectedStatusFilter("all");
              }}
              className="font-mono text-xs mt-1"
            >
              Show All Tasks ({milestones.length})
            </Button>
          </div>
        ) : (
          visibleMilestones.map((milestone) => {
            const isCompletedTask = milestone.status === "completed";
            const isUnlocked = milestone.status === "unlocked";
            const isLocked = milestone.status === "locked";
            const isSubmitting = isPending && submittingTaskId === milestone.id;
            const error = taskErrors[milestone.id];
            const isHintRevealed = Boolean(revealedHints[milestone.id]);

            return (
              <div
                key={milestone.id}
                className={cn(
                  "rounded-lg border transition-all p-4.5 sm:p-5 flex flex-col gap-3 w-full",
                  isCompletedTask && "border-emerald-500/30 bg-emerald-950/10",
                  isUnlocked && "border-primary/40 bg-card shadow-xs",
                  isLocked && "border-border/60 bg-muted/20 opacity-70",
                )}
              >
                {/* Task Top Meta */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex items-center justify-center h-6 px-2.5 rounded font-mono text-xs font-semibold",
                        isCompletedTask && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
                        isUnlocked && "bg-primary/20 text-primary border border-primary/30",
                        isLocked && "bg-muted text-muted-foreground",
                      )}
                    >
                      Task {milestone.sortOrder}
                    </span>
                    <h3 className="font-medium text-sm text-foreground">{milestone.title}</h3>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    {/* Normalized Phase Badge */}
                    <Badge variant="outline" className="text-[11px] text-muted-foreground border-border/80 bg-background/50">
                      {getPhaseDisplayName(milestone.phase)}
                    </Badge>

                    {isCompletedTask ? (
                      <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 gap-1 text-[11px]">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                      </Badge>
                    ) : isUnlocked ? (
                      <Badge variant="outline" className="border-primary/40 text-primary gap-1 text-[11px]">
                        <Sparkles className="h-3 w-3" />
                        In Progress
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground gap-1 text-[11px]">
                        <Lock className="h-3 w-3" />
                        Locked
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <p className="text-sm text-foreground leading-relaxed font-sans">
                  {milestone.question}
                </p>

                {/* Format Hint Badge */}
                {milestone.formatHint && !isCompletedTask && (
                  <div className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded w-fit border border-border/50">
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                    <span>{milestone.formatHint}</span>
                  </div>
                )}

                {/* Completed State Banner */}
                {isCompletedTask && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-md text-xs font-mono">
                    <span className="text-muted-foreground">Accepted Answer:</span>
                    <span className="text-emerald-400 font-semibold">{milestone.userAnswer || "Verified"}</span>
                    {milestone.completedAt && (
                      <span className="text-muted-foreground/70 text-[10px] ml-auto">
                        {new Date(milestone.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                )}

                {/* Active / Unlocked Task Input Form */}
                {isUnlocked && !isCompleted && (
                  <div className="mt-2 flex flex-col gap-2.5">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit(milestone);
                      }}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                    >
                      <Input
                        type="text"
                        value={userInputs[milestone.id] || ""}
                        onChange={(e) => handleInputChange(milestone.id, e.target.value)}
                        placeholder={milestone.formatHint ? `Enter answer (${milestone.formatHint})...` : "Enter your answer..."}
                        disabled={isSubmitting}
                        className="font-mono text-xs h-9 bg-background focus:ring-1 focus:ring-primary flex-1"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isSubmitting || !(userInputs[milestone.id] || "").trim()}
                          className="h-9 px-4 font-mono text-xs gap-1.5 shrink-0"
                        >
                          <Send className="h-3 w-3" />
                          <span>{isSubmitting ? "Verifying..." : "Submit Task"}</span>
                        </Button>

                        {milestone.hint && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => toggleHint(milestone.id)}
                            className={cn(
                              "h-9 px-3 font-mono text-xs gap-1 shrink-0",
                              isHintRevealed && "border-amber-500/40 text-amber-400 bg-amber-500/10",
                            )}
                            title="Show progressive hint for this task"
                          >
                            <Lightbulb className="h-3.5 w-3.5" />
                            <span>Hint</span>
                          </Button>
                        )}
                      </div>
                    </form>

                    {/* Inline Error Message */}
                    {error && (
                      <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Inline Hint Card */}
                    {isHintRevealed && milestone.hint && (
                      <div className="flex flex-col gap-1.5 bg-amber-950/20 border border-amber-500/30 p-3 rounded text-xs text-amber-300 font-sans animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold flex items-center gap-1">
                            <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                            Checkpoint Hint:
                          </span>
                          {onConsultMentor && (
                            <button
                              type="button"
                              onClick={() => onConsultMentor(milestone.question, milestone.title)}
                              className="text-amber-400 hover:underline font-mono text-[11px]"
                            >
                              Consult AI Mentor →
                            </button>
                          )}
                        </div>
                        <p className="leading-relaxed">{milestone.hint}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
