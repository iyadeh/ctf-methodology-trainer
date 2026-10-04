import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Compass,
  FileCheck2,
  Lightbulb,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SessionReviewData } from "@/modules/review/types";

interface OverviewTabProps {
  readonly review: SessionReviewData;
}

function getScoreColor(score: number): {
  text: string;
  bar: string;
  bg: string;
  border: string;
} {
  if (score >= 85) {
    return {
      text: "text-emerald-400",
      bar: "bg-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
    };
  }
  if (score >= 70) {
    return {
      text: "text-sky-400",
      bar: "bg-sky-500",
      bg: "bg-sky-500/10",
      border: "border-sky-500/30",
    };
  }
  if (score >= 50) {
    return {
      text: "text-amber-400",
      bar: "bg-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
    };
  }
  return {
    text: "text-rose-400",
    bar: "bg-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
  };
}

export function OverviewTab({ review }: OverviewTabProps) {
  const { metrics, narrative, improvementAreas } = review;

  const reconColors = getScoreColor(metrics.reconCoverage);
  const gateColors = getScoreColor(metrics.phaseGateCompliance);
  const hypoColors = getScoreColor(metrics.hypothesisDiscipline);
  const docColors = getScoreColor(metrics.documentationCoverage);

  return (
    <div className="space-y-6">
      {/* 1. Primary Metrics Grid */}
      <div>
        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Methodology Performance Metrics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Recon Coverage */}
          <Card className="p-4 border-border bg-card">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">Recon Coverage</span>
              <span className={cn("font-mono text-xs font-semibold px-2 py-0.5 rounded border", reconColors.bg, reconColors.text, reconColors.border)}>
                {metrics.reconCoverage}%
              </span>
            </div>
            <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-foreground">
              {metrics.reconCoverage}%
            </div>
            <div className="mt-2.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full transition-all", reconColors.bar)} style={{ width: `${metrics.reconCoverage}%` }} />
            </div>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              {metrics.breakdown.recon.completed} of {metrics.breakdown.recon.total} recon checks completed
            </p>
          </Card>

          {/* Phase Gate Compliance */}
          <Card className="p-4 border-border bg-card">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">Gate Compliance</span>
              <span className={cn("font-mono text-xs font-semibold px-2 py-0.5 rounded border", gateColors.bg, gateColors.text, gateColors.border)}>
                {metrics.phaseGateCompliance}%
              </span>
            </div>
            <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-foreground">
              {metrics.phaseGateCompliance}%
            </div>
            <div className="mt-2.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full transition-all", gateColors.bar)} style={{ width: `${metrics.phaseGateCompliance}%` }} />
            </div>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              {metrics.breakdown.gates.compliantTransitions} compliant transitions ({metrics.phaseOverrides} override{metrics.phaseOverrides === 1 ? "" : "s"})
            </p>
          </Card>

          {/* Hypothesis Discipline */}
          <Card className="p-4 border-border bg-card">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">Hypothesis Discipline</span>
              <span className={cn("font-mono text-xs font-semibold px-2 py-0.5 rounded border", hypoColors.bg, hypoColors.text, hypoColors.border)}>
                {metrics.hypothesisDiscipline}%
              </span>
            </div>
            <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-foreground">
              {metrics.hypothesisDiscipline}%
            </div>
            <div className="mt-2.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full transition-all", hypoColors.bar)} style={{ width: `${metrics.hypothesisDiscipline}%` }} />
            </div>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              {metrics.breakdown.hypotheses.attemptsWithHypothesis} of {metrics.breakdown.hypotheses.totalAttempts} attempts hypothesis-linked
            </p>
          </Card>

          {/* Documentation Coverage */}
          <Card className="p-4 border-border bg-card">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">Documentation</span>
              <span className={cn("font-mono text-xs font-semibold px-2 py-0.5 rounded border", docColors.bg, docColors.text, docColors.border)}>
                {metrics.documentationCoverage}%
              </span>
            </div>
            <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-foreground">
              {metrics.documentationCoverage}%
            </div>
            <div className="mt-2.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full transition-all", docColors.bar)} style={{ width: `${metrics.documentationCoverage}%` }} />
            </div>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              {metrics.breakdown.documentation.confirmedWithEvidence} of {metrics.breakdown.documentation.totalConfirmed} findings documented
            </p>
          </Card>
        </div>
      </div>

      {/* 2. Secondary Counters Strip */}
      <Card className="p-3.5 sm:p-4 border-border bg-card/60">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <div className="font-mono text-sm sm:text-base font-bold text-foreground">
                {metrics.totalDurationFormatted}
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">Total Time</div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:pl-4">
            <FileCheck2 className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <div className="font-mono text-sm sm:text-base font-bold text-foreground">
                {metrics.totalChecksCompleted}
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">Checks Completed</div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:pl-4">
            <Lightbulb className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-mono text-sm sm:text-base font-bold text-foreground">
                {metrics.hintsUsed} Hint{metrics.hintsUsed === 1 ? "" : "s"}
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {metrics.machineHints} machine, {metrics.fullReveals} reveal
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:pl-4">
            <ShieldAlert className={cn("h-5 w-5 shrink-0", metrics.phaseOverrides > 0 ? "text-amber-400" : "text-emerald-400")} />
            <div>
              <div className="font-mono text-sm sm:text-base font-bold text-foreground">
                {metrics.phaseOverrides} Override{metrics.phaseOverrides === 1 ? "" : "s"}
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">Gate Deviations</div>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. Executive Review & Narrative */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 border-border bg-card">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Compass className="h-4 w-4 text-primary" />
                Methodology Narrative Review
              </h4>
              {narrative.isAiGenerated ? (
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                  <Sparkles className="h-3 w-3" />
                  AI ASSISTED
                </span>
              ) : (
                <span className="font-mono text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  DETERMINISTIC EVALUATION
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {narrative.executiveSummary}
            </p>

            {/* Strengths */}
            <div className="mt-4 pt-4 border-t border-border">
              <h5 className="font-mono text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                Demonstrated Strengths
              </h5>
              <ul className="space-y-1.5">
                {narrative.strengths.map((strength, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-emerald-400 font-mono select-none">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Strategic Recommendation */}
            <div className="mt-4 pt-4 border-t border-border">
              <h5 className="font-mono text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-sky-400" />
                Strategic Recommendation
              </h5>
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                &ldquo;{narrative.recommendation}&rdquo;
              </p>
            </div>
          </Card>
        </div>

        {/* 4. Areas to Improve Card */}
        <div>
          <Card className="p-5 border-border bg-card h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Areas to Improve
              </h4>
              <Badge variant="outline" className="font-mono text-[10px]">
                {improvementAreas.length} Target{improvementAreas.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Focus on these areas to strengthen your methodology discipline:
            </p>

            <div className="space-y-3 flex-1">
              {improvementAreas.map((area, idx) => (
                <div
                  key={area.id}
                  className="rounded border border-border/80 bg-muted/20 p-3 transition-colors hover:border-border"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {idx + 1}. {area.title}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-[9px] uppercase",
                        area.severity === "high"
                          ? "border-rose-500/40 text-rose-400 bg-rose-500/10"
                          : area.severity === "medium"
                            ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                            : "border-sky-500/40 text-sky-400 bg-sky-500/10",
                      )}
                    >
                      {area.severity}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {area.description}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
