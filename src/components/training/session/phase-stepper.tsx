import { CheckCircle2, Lock, PlayCircle } from "lucide-react";
import type { SessionPhaseSnapshot } from "@/modules/training/types";
import { cn } from "@/lib/utils";

interface PhaseStepperProps {
  readonly phases: readonly SessionPhaseSnapshot[];
  readonly currentPhaseKey: string | null;
  readonly viewedPhaseKey?: string | null;
  readonly onSelectPhase?: (phaseKey: string) => void;
}

export function PhaseStepper({
  phases,
  currentPhaseKey,
  viewedPhaseKey,
  onSelectPhase,
}: PhaseStepperProps) {
  const activeViewKey = viewedPhaseKey ?? currentPhaseKey;

  return (
    <nav
      aria-label="PTES Methodology Phases"
      className="overflow-x-auto border-b border-border bg-card/40 pb-px"
    >
      <ol className="flex min-w-[700px] items-stretch">
        {phases.map((phase, index) => {
          const isActive = phase.semanticKey === currentPhaseKey;
          const isViewed = phase.semanticKey === activeViewKey;
          const isCompleted = phase.status === "completed";
          const isLocked = phase.status === "locked";

          const totalChecks = phase.checks.length;
          const completedChecks = phase.checks.filter(
            (c) => c.status === "completed",
          ).length;

          return (
            <li key={phase.id} className="flex-1">
              <button
                type="button"
                onClick={() => onSelectPhase?.(phase.semanticKey)}
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "group relative flex w-full h-full flex-col justify-between border-r border-border/60 p-3.5 text-left transition-colors cursor-pointer hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                  isViewed && "bg-primary/10 border-b-2 border-b-primary",
                  isActive && !isViewed && "border-b-2 border-b-primary/40 bg-card/40",
                  isCompleted && !isViewed && "bg-card/20",
                  isLocked && !isViewed && "opacity-60 hover:opacity-85",
                )}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      Phase 0{index + 1}
                    </span>
                    {isViewed && !isActive && (
                      <span className="rounded bg-primary/20 px-1 py-0 text-[9px] font-mono font-medium text-primary uppercase">
                        Viewing
                      </span>
                    )}
                  </div>
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-label="Completed" />
                  ) : isActive ? (
                    <PlayCircle className="h-4 w-4 text-primary shrink-0 animate-pulse" aria-label="Active" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" aria-label="Locked" />
                  )}
                </div>

                <div className="mt-2 w-full">
                  <p
                    className={cn(
                      "text-xs font-medium tracking-tight",
                      isViewed || isActive ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {phase.name}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {completedChecks}/{totalChecks} checks
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
