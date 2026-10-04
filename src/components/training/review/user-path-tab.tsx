import {
  ArrowDown,
  CheckCircle2,
  Clock,
  Compass,
  FileCode,
  Flag,
  Globe,
  Milestone,
  Search,
  Terminal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SessionReviewData, UserPathStep } from "@/modules/review/types";

interface UserPathTabProps {
  readonly review: SessionReviewData;
}

function getPhaseColor(phase: string) {
  switch (phase.toLowerCase()) {
    case "reconnaissance":
      return "border-sky-500/40 text-sky-400 bg-sky-500/10";
    case "threat_modeling":
      return "border-indigo-500/40 text-indigo-400 bg-indigo-500/10";
    case "vulnerability_analysis":
      return "border-amber-500/40 text-amber-400 bg-amber-500/10";
    case "exploitation":
      return "border-rose-500/40 text-rose-400 bg-rose-500/10";
    case "post_exploitation":
      return "border-emerald-500/40 text-emerald-400 bg-emerald-500/10";
    default:
      return "border-zinc-500/40 text-zinc-400 bg-zinc-500/10";
  }
}

function getStepIcon(kind: UserPathStep["kind"]) {
  switch (kind) {
    case "phase_start":
      return <Compass className="h-3.5 w-3.5 text-sky-400" />;
    case "service_discovery":
      return <Globe className="h-3.5 w-3.5 text-sky-400" />;
    case "surface_enumeration":
      return <Search className="h-3.5 w-3.5 text-indigo-400" />;
    case "vulnerability":
      return <FileCode className="h-3.5 w-3.5 text-amber-400" />;
    case "hypothesis":
      return <Milestone className="h-3.5 w-3.5 text-indigo-400" />;
    case "attempt":
      return <Terminal className="h-3.5 w-3.5 text-rose-400" />;
    case "objective_capture":
      return <Flag className="h-3.5 w-3.5 text-emerald-400" />;
    default:
      return <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

export function UserPathTab({ review }: UserPathTabProps) {
  const { userPath, metrics } = review;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Left Summary Card */}
      <div className="lg:col-span-1 space-y-4">
        <Card className="p-5 border-border bg-card">
          <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Execution Overview
          </h4>
          <div className="space-y-4">
            <div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {metrics.totalDurationFormatted}
              </div>
              <div className="font-mono text-xs text-muted-foreground">Total Time Elapsed</div>
            </div>

            <div className="pt-3 border-t border-border">
              <div className="text-2xl font-bold font-mono text-foreground">
                {userPath.length}
              </div>
              <div className="font-mono text-xs text-muted-foreground">Chronological Steps</div>
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-muted-foreground">Findings:</span>
                <span className="font-semibold text-foreground">{metrics.totalFindingsRecorded}</span>
              </div>
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-muted-foreground">Hypotheses:</span>
                <span className="font-semibold text-foreground">{metrics.totalHypothesesFormed}</span>
              </div>
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-muted-foreground">Attempts:</span>
                <span className="font-semibold text-foreground">{metrics.totalAttemptsExecuted}</span>
              </div>
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-muted-foreground">Checks Completed:</span>
                <span className="font-semibold text-foreground">{metrics.totalChecksCompleted}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-border bg-card/60">
          <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
            Your path is reconstructed from timestamped evidence, structured findings, test hypotheses, and objective captures recorded during the assessment.
          </p>
        </Card>
      </div>

      {/* Main Chronological Timeline */}
      <div className="lg:col-span-3">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Activity Timeline Sequence ({userPath.length} Milestones)
          </h3>
          <span className="font-mono text-[11px] text-muted-foreground">
            Earliest → Completion
          </span>
        </div>

        <div className="space-y-3">
          {userPath.map((step, idx) => {
            const isLast = idx === userPath.length - 1;
            const isObjective = step.kind === "objective_capture";

            return (
              <div key={step.id} className="relative flex flex-col items-center">
                <div
                  className={cn(
                    "w-full rounded-lg border p-4 transition-colors",
                    isObjective
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : "border-border bg-card hover:border-border/80",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted border border-border text-foreground flex items-center gap-1.5">
                        {getStepIcon(step.kind)}
                        STEP {String(step.stepNumber).padStart(2, "0")}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("font-mono text-[10px] uppercase font-semibold", getPhaseColor(step.phase))}
                      >
                        {step.phase.replace(/_/g, " ")}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                        {step.kind.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>+{step.durationFormatted ?? "0m"}</span>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-foreground">
                    {step.title}
                  </h4>

                  {step.description && (
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {step.description}
                    </p>
                  )}

                  {step.evidence && (
                    <div className="mt-2.5 rounded border border-border bg-muted/30 p-2 font-mono text-xs text-foreground/90 overflow-x-auto">
                      <span className="text-muted-foreground select-none">Evidence: </span>
                      {step.evidence}
                    </div>
                  )}
                </div>

                {!isLast && (
                  <div className="my-1.5 flex items-center justify-center text-muted-foreground/40">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
