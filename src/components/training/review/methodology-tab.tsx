import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SessionReviewData } from "@/modules/review/types";

interface MethodologyTabProps {
  readonly review: SessionReviewData;
}

export function MethodologyTab({ review }: MethodologyTabProps) {
  const { phases, checks, deviations, metrics } = review;

  return (
    <div className="space-y-6">
      {/* 1. Methodology Discipline Summary Card */}
      <Card className="p-5 border-border bg-card">
        <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          PTES Framework Phase Gate Discipline
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div className="rounded border border-border bg-muted/20 p-3">
            <span className="text-muted-foreground block mb-1">Gate Compliance</span>
            <span className="text-xl font-bold text-foreground">{metrics.phaseGateCompliance}%</span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">
              {metrics.breakdown.gates.compliantTransitions} / {metrics.breakdown.gates.totalTransitions} transitions
            </span>
          </div>

          <div className="rounded border border-border bg-muted/20 p-3">
            <span className="text-muted-foreground block mb-1">Phase Gate Overrides</span>
            <span className={cn("text-xl font-bold", metrics.phaseOverrides > 0 ? "text-amber-400" : "text-emerald-400")}>
              {metrics.phaseOverrides}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">
              Deviations recorded
            </span>
          </div>

          <div className="rounded border border-border bg-muted/20 p-3">
            <span className="text-muted-foreground block mb-1">Total Checklist Items</span>
            <span className="text-xl font-bold text-foreground">
              {metrics.totalChecksCompleted} / {checks.length}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">
              {Math.round((metrics.totalChecksCompleted / (checks.length || 1)) * 100)}% overall completion
            </span>
          </div>
        </div>
      </Card>

      {/* 2. Phase-by-Phase Execution Breakdown */}
      <div>
        <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          PTES Phase Breakdown
        </h4>

        <div className="space-y-3">
          {phases.map((phase, idx) => {
            const phaseChecks = checks.filter((c) => c.sessionPhaseId === phase.id);
            const completedInPhase = phaseChecks.filter((c) => c.status === "completed").length;
            const skippedInPhase = phaseChecks.filter((c) => c.status === "skipped").length;
            const requiredInPhase = phaseChecks.filter((c) => c.priority === "required").length;
            const completedRequired = phaseChecks.filter(
              (c) => c.priority === "required" && c.status === "completed",
            ).length;
            const phaseCoverage =
              phaseChecks.length > 0 ? Math.round((completedInPhase / phaseChecks.length) * 100) : 100;

            const isRecon = phase.semanticKey === "reconnaissance";

            return (
              <div
                key={phase.id}
                className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-border/80"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-muted-foreground px-2 py-0.5 rounded bg-muted">
                      PHASE {idx + 1}
                    </span>
                    <h5 className="text-sm font-semibold text-foreground">
                      {phase.name}
                    </h5>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] uppercase border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                    >
                      {phase.status}
                    </Badge>
                    {isRecon && (
                      <Badge variant="outline" className="font-mono text-[10px] border-sky-500/40 text-sky-400 bg-sky-500/10">
                        PRIMARY RECON GATE
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
                    <span>
                      <strong className="text-foreground">{completedInPhase}</strong>/{phaseChecks.length} checks ({phaseCoverage}%)
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${phaseCoverage}%` }}
                  />
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-4 font-mono text-[11px] text-muted-foreground">
                  <span>Required: {completedRequired}/{requiredInPhase} completed</span>
                  {skippedInPhase > 0 && <span>Skipped: {skippedInPhase}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Methodology Deviations & Phase Gate Overrides Log */}
      <div>
        <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Recorded Deviations & Overrides ({deviations.length})
        </h4>

        {deviations.length === 0 ? (
          <Card className="p-4 border-border bg-card text-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1.5" />
            <p className="font-mono text-xs text-foreground font-semibold">
              Zero Methodology Deviations
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              All phase gate transitions were satisfied deterministically without manual bypass.
            </p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {deviations.map((dev) => (
              <div
                key={dev.id}
                className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="border-amber-500/40 text-amber-400 font-mono text-[10px]">
                      {dev.type.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {dev.phaseName ? `Phase: ${dev.phaseName}` : "Phase Transition"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reason: {dev.reason || "Manual override executed at phase gate without explicit justification."}
                  </p>
                </div>

                <div className="font-mono text-[11px] text-muted-foreground shrink-0 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {new Date(dev.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
