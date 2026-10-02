"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CornerDownRight,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SessionCheckRecord, SessionPhaseSnapshot } from "@/modules/training/types";
import {
  advancePhaseAction,
  completeCheckAction,
  skipCheckAction,
} from "@/app/training/[sessionId]/actions";

interface ChecklistSectionProps {
  readonly sessionId: string;
  readonly currentPhase: SessionPhaseSnapshot | null;
  readonly isFinalPhase: boolean;
}

interface ChecklistGroup {
  readonly id: string;
  readonly name: string;
  readonly provenance: "core" | "playbook" | "generic";
  readonly checks: SessionCheckRecord[];
}

function groupChecks(checks: SessionCheckRecord[]): ChecklistGroup[] {
  const groups: ChecklistGroup[] = [];

  const coreChecks = checks.filter((c) => c.provenance === "core");
  if (coreChecks.length > 0) {
    groups.push({
      id: "core",
      name: "Core PTES Methodology",
      provenance: "core",
      checks: coreChecks,
    });
  }

  // Group playbook checks by playbook prefix
  const playbookChecks = checks.filter((c) => c.provenance === "playbook");
  const playbookMap = new Map<string, SessionCheckRecord[]>();

  for (const check of playbookChecks) {
    // E.g. "playbook.http.manual-inspection" -> "http"
    const parts = check.semanticKey.split(".");
    const slug = parts[1] ?? "service";
    const existing = playbookMap.get(slug) ?? [];
    existing.push(check);
    playbookMap.set(slug, existing);
  }

  for (const [slug, items] of playbookMap.entries()) {
    const formattedName = slug.toUpperCase() + " Playbook";
    groups.push({
      id: `playbook-${slug}`,
      name: formattedName,
      provenance: "playbook",
      checks: items,
    });
  }

  // Group generic service checks
  const genericChecks = checks.filter((c) => c.provenance === "generic");
  const genericMap = new Map<string, SessionCheckRecord[]>();

  for (const check of genericChecks) {
    // E.g. "playbook.generic.confirm-identity.mqtt" -> "mqtt"
    const parts = check.semanticKey.split(".");
    const serviceName = parts[parts.length - 1] ?? "service";
    const existing = genericMap.get(serviceName) ?? [];
    existing.push(check);
    genericMap.set(serviceName, existing);
  }

  for (const [serviceName, items] of genericMap.entries()) {
    groups.push({
      id: `generic-${serviceName}`,
      name: `Generic Service: ${serviceName.toUpperCase()}`,
      provenance: "generic",
      checks: items,
    });
  }

  return groups;
}

export function ChecklistSection({
  sessionId,
  currentPhase,
  isFinalPhase,
}: ChecklistSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [blockedGate, setBlockedGate] = useState<{
    missingChecks: readonly { semanticKey: string; title: string }[];
  } | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverrideInput, setShowOverrideInput] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);

  if (!currentPhase) {
    return (
      <Card className="m-6 border-dashed text-center">
        <CardContent className="py-12">
          <p className="text-sm text-muted-foreground">
            Session is not started or has completed all phases.
          </p>
        </CardContent>
      </Card>
    );
  }

  const groups = groupChecks(currentPhase.checks);

  const handleToggleCheck = (check: SessionCheckRecord) => {
    if (check.status === "superseded" || check.status === "inactive") return;

    startTransition(async () => {
      if (check.status === "completed") {
        // Toggle not directly supported in MVP, but can skip/complete
        return;
      }
      await completeCheckAction(sessionId, check.id);
    });
  };

  const handleSkipCheck = (checkId: string) => {
    startTransition(async () => {
      await skipCheckAction(sessionId, checkId);
    });
  };

  const handleAdvance = (override = false) => {
    setAdvanceError(null);
    startTransition(async () => {
      const reason = override ? overrideReason.trim() : undefined;
      const res = await advancePhaseAction(sessionId, reason);
      if (!res.ok) {
        setAdvanceError(res.error);
        return;
      }

      if (res.result.status === "blocked") {
        setBlockedGate({
          missingChecks: res.result.gate.missingRequiredChecks,
        });
      } else {
        setBlockedGate(null);
        setShowOverrideInput(false);
        setOverrideReason("");
      }
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Groups */}
      {groups.map((group) => {
        const completedCount = group.checks.filter((c) => c.status === "completed").length;
        const totalCount = group.checks.length;

        return (
          <Card key={group.id} className="border-border/80 bg-card/80">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 py-3.5 px-4 sm:px-5">
              <div className="flex items-center gap-2.5">
                <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
                  {group.name}
                </CardTitle>
                <Badge
                  variant={
                    group.provenance === "core"
                      ? "secondary"
                      : group.provenance === "playbook"
                        ? "default"
                        : "outline"
                  }
                  className="font-mono text-[10px] uppercase"
                >
                  {group.provenance}
                </Badge>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {completedCount}/{totalCount} completed
              </span>
            </CardHeader>

            <CardContent className="divide-y divide-border/40 p-0">
              {group.checks.map((check) => {
                const isCompleted = check.status === "completed";
                const isSkipped = check.status === "skipped";
                const isSuperseded = check.status === "superseded";
                const isInactive = check.status === "inactive";

                return (
                  <div
                    key={check.id}
                    className={cn(
                      "flex flex-col gap-2 p-4 transition-colors sm:flex-row sm:items-start sm:justify-between sm:gap-4",
                      isCompleted && "bg-primary/[0.02]",
                      isSuperseded && "opacity-50 line-through bg-muted/20",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleCheck(check)}
                        disabled={isPending || isSuperseded || isInactive || isCompleted}
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                          isCompleted
                            ? "border-primary bg-primary text-primary-foreground"
                            : isSkipped
                              ? "border-muted-foreground/60 bg-muted/60 text-muted-foreground"
                              : "border-border hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                        )}
                        aria-label={`Mark ${check.title} as completed`}
                      >
                        {isCompleted && <Check className="h-3 w-3 stroke-[3]" />}
                      </button>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={cn(
                              "text-xs font-medium tracking-tight",
                              isCompleted ? "text-foreground font-semibold" : "text-foreground",
                            )}
                          >
                            {check.title}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono text-[9px] uppercase",
                              check.priority === "required" && "border-amber-500/50 text-amber-400",
                              check.priority === "recommended" && "border-blue-500/50 text-blue-400",
                              check.priority === "suggested" && "border-zinc-500/50 text-zinc-400",
                            )}
                          >
                            {check.priority}
                          </Badge>
                          {isSuperseded && (
                            <Badge variant="outline" className="border-red-500/50 text-red-400 font-mono text-[9px]">
                              Superseded
                            </Badge>
                          )}
                          {isSkipped && (
                            <Badge variant="outline" className="font-mono text-[9px] text-muted-foreground">
                              Skipped
                            </Badge>
                          )}
                        </div>

                        {check.description && (
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {check.description}
                          </p>
                        )}
                        <p className="font-mono text-[10px] text-muted-foreground/70">
                          {check.semanticKey}
                        </p>
                      </div>
                    </div>

                    {!isCompleted && !isSuperseded && !isSkipped && (
                      <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-start">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSkipCheck(check.id)}
                          disabled={isPending}
                          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                          title="Skip check (does not count toward coverage)"
                        >
                          <SkipForward className="mr-1 h-3 w-3" />
                          Skip
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Advance Phase Button */}
      <div className="flex flex-col items-end gap-2 border-t border-border/80 pt-4">
        {advanceError && <p className="text-xs text-destructive">{advanceError}</p>}
        {!isFinalPhase ? (
          <Button
            type="button"
            onClick={() => handleAdvance(false)}
            disabled={isPending}
            className="gap-2 font-medium"
          >
            Advance to Next Phase
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Final phase reached (Reporting). Complete session when finished.
          </div>
        )}
      </div>

      {/* Phase Gate Modal */}
      {blockedGate && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Phase Gate Blocked
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Methodology requires all <span className="font-semibold text-foreground">Required</span> checks in this phase to be completed before advancing to prevent premature exploitation.
                </p>
              </div>
            </div>

            <div className="mt-4 max-h-48 overflow-y-auto rounded border border-border/60 bg-background/60 p-3">
              <p className="font-mono text-[11px] font-semibold text-muted-foreground uppercase">
                Missing Required Checks ({blockedGate.missingChecks.length})
              </p>
              <ul className="mt-2 space-y-1.5">
                {blockedGate.missingChecks.map((check) => (
                  <li key={check.semanticKey} className="flex items-start gap-2 text-xs text-foreground">
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>{check.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            {showOverrideInput ? (
              <div className="mt-4 space-y-2">
                <label htmlFor="override-reason" className="text-xs font-medium text-foreground">
                  Explain reason for methodology deviation:
                </label>
                <textarea
                  id="override-reason"
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Host unreachable on alternative ports, proceeding with discovered web interface."
                  className="w-full rounded border border-border bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOverrideInput(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isPending || !overrideReason.trim()}
                    onClick={() => handleAdvance(true)}
                    className="text-xs"
                  >
                    Confirm Override & Advance
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOverrideInput(true)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <CornerDownRight className="mr-1 h-3.5 w-3.5" />
                  Override Gate...
                </Button>

                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => setBlockedGate(null)}
                  className="text-xs"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Return to Phase
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
