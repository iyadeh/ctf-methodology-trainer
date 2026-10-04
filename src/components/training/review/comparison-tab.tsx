import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Lock,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PathComparisonItem, SessionReviewData } from "@/modules/review/types";

interface ComparisonTabProps {
  readonly review: SessionReviewData;
}

function getStatusBadge(status: PathComparisonItem["userStatus"]) {
  switch (status) {
    case "matched":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-semibold gap-1"
        >
          <CheckCircle2 className="h-3 w-3" />
          MATCHED
        </Badge>
      );
    case "partially_matched":
      return (
        <Badge
          variant="outline"
          className="border-amber-500/40 bg-amber-500/10 text-amber-400 font-mono text-[10px] font-semibold gap-1"
        >
          <AlertCircle className="h-3 w-3" />
          PARTIAL
        </Badge>
      );
    case "unmatched":
      return (
        <Badge
          variant="outline"
          className="border-zinc-500/40 bg-zinc-500/10 text-zinc-400 font-mono text-[10px] font-semibold gap-1"
        >
          <HelpCircle className="h-3 w-3" />
          UNOBSERVED
        </Badge>
      );
    default:
      return null;
  }
}

export function ComparisonTab({ review }: ComparisonTabProps) {
  const { comparison, referencePath } = review;

  if (!referencePath || !referencePath.available || comparison.length === 0) {
    return (
      <Card className="p-8 text-center border-border bg-card">
        <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <h4 className="text-base font-semibold text-foreground">
          No Canonical Reference Path Available
        </h4>
        <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
          This machine did not have a verified writeup attack graph generated, or the session was completed without an associated reference path.
        </p>
      </Card>
    );
  }

  const matchedCount = comparison.filter((c) => c.userStatus === "matched").length;
  const partialCount = comparison.filter((c) => c.userStatus === "partially_matched").length;
  const matchPercentage = Math.round(((matchedCount + partialCount * 0.5) / comparison.length) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <Card className="p-4 sm:p-5 border-border bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Path Alignment: User Process vs Reference Attack Chain
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
              Evaluates how your recorded enumeration and exploit findings aligned with the canonical writeup steps. Independent alternative techniques remain completely valid.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
            <div className="text-right">
              <div className="text-xl font-bold text-foreground">{matchPercentage}%</div>
              <div className="text-[10px] text-muted-foreground">Step Alignment</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-right">
              <div className="text-xl font-bold text-emerald-400">
                {matchedCount}/{comparison.length}
              </div>
              <div className="text-[10px] text-muted-foreground">Canonical Steps</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Comparison Items */}
      <div className="space-y-3.5">
        {comparison.map((item) => (
          <div
            key={item.referenceNodeId}
            className="rounded-lg border border-border bg-card p-4 sm:p-5 transition-colors hover:border-border/80"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                  REF STEP {String(item.referenceStepNumber).padStart(2, "0")}
                </span>
                <Badge variant="outline" className="font-mono text-[10px] uppercase">
                  {item.referencePhase.replace(/_/g, " ")}
                </Badge>
                {item.referenceTools && item.referenceTools.length > 0 && (
                  <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground gap-1">
                    <Wrench className="h-2.5 w-2.5" />
                    {item.referenceTools.join(", ")}
                  </Badge>
                )}
              </div>

              <div>{getStatusBadge(item.userStatus)}</div>
            </div>

            {/* Reference Step Description */}
            <h4 className="text-sm font-semibold text-foreground">
              {item.referenceTitle}
            </h4>

            {/* User Alignment Section */}
            <div className="mt-3 pt-3 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="font-mono text-[11px] text-muted-foreground block mb-1">
                  Learner Execution Correlation:
                </span>
                {item.matchedUserStepTitle ? (
                  <p className="font-medium text-foreground">
                    {item.matchedUserStepTitle}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic">
                    No specific finding directly tagged to this canonical step.
                  </p>
                )}
              </div>

              <div>
                <span className="font-mono text-[11px] text-muted-foreground block mb-1">
                  Evidence & Notes:
                </span>
                <p className="text-muted-foreground">
                  {item.matchedEvidence ? (
                    <span className="font-mono text-[11px] text-foreground/90 bg-muted/30 px-1.5 py-0.5 rounded border border-border">
                      {item.matchedEvidence}
                    </span>
                  ) : (
                    item.notes
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
