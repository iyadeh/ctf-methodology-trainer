import { CheckCircle2, Lock, PlayCircle } from "lucide-react";
import type { SessionPhaseSnapshot } from "@/modules/training/types";
import { cn } from "@/lib/utils";

interface PhaseStepperProps {
  readonly phases: readonly SessionPhaseSnapshot[];
  readonly currentPhaseKey: string | null;
}

export function PhaseStepper({ phases, currentPhaseKey }: PhaseStepperProps) {
  return (
    <nav
      aria-label="PTES Methodology Phases"
      className="overflow-x-auto border-b border-border bg-card/40 pb-px"
    >
      <ol className="flex min-w-[700px] items-stretch">
        {phases.map((phase, index) => {
          const isCurrent = phase.semanticKey === currentPhaseKey;
          const isCompleted = phase.status === "completed";
          const isLocked = phase.status === "locked";

          const totalChecks = phase.checks.length;
          const completedChecks = phase.checks.filter(
            (c) => c.status === "completed",
          ).length;

          return (
            <li
              key={phase.id}
              className={cn(
                "relative flex flex-1 flex-col justify-between border-r border-border/60 p-3.5 transition-colors",
                isCurrent && "bg-primary/5 border-b-2 border-b-primary",
                isCompleted && "bg-card/20",
                isLocked && "opacity-60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Phase 0{index + 1}
                </span>
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-label="Completed" />
                ) : isCurrent ? (
                  <PlayCircle className="h-4 w-4 text-primary animate-pulse" aria-label="Active" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground/60" aria-label="Locked" />
                )}
              </div>

              <div className="mt-2">
                <p
                  className={cn(
                    "text-xs font-medium tracking-tight",
                    isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {phase.name}
                </p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {completedChecks}/{totalChecks} checks
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
