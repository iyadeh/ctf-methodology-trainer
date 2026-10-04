"use client";

import { ChevronRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MethodologyPhaseReference } from "@/modules/methodology/reference";

interface PhaseNavigatorProps {
  readonly phases: readonly MethodologyPhaseReference[];
  readonly selectedPhaseKey: string;
  readonly onSelectPhase: (phaseKey: string) => void;
}

export function PhaseNavigator({
  phases,
  selectedPhaseKey,
  onSelectPhase,
}: PhaseNavigatorProps) {
  return (
    <div className="h-full overflow-y-auto border-r border-border bg-card/20 p-4 space-y-3">
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Layers className="h-3.5 w-3.5 text-foreground/70" />
          <span>Methodology Phases</span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {phases.length} Phases
        </span>
      </div>

      <nav aria-label="Methodology phases" className="space-y-1.5">
        {phases.map((phase) => {
          const isSelected = selectedPhaseKey === phase.semanticKey;

          return (
            <button
              key={phase.semanticKey}
              type="button"
              onClick={() => onSelectPhase(phase.semanticKey)}
              className={cn(
                "group flex w-full items-start gap-3 rounded-md border p-3 text-left transition-all",
                isSelected
                  ? "border-emerald-500/50 bg-emerald-500/10 text-foreground shadow-sm"
                  : "border-border/60 bg-card/60 text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono text-xs font-bold transition-colors",
                  isSelected
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-muted/40 text-muted-foreground border border-border group-hover:text-foreground",
                )}
              >
                {phase.phaseNumber}
              </span>

              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "font-mono text-xs font-semibold truncate",
                      isSelected
                        ? "text-emerald-300"
                        : "text-foreground group-hover:text-foreground",
                    )}
                  >
                    {phase.name}
                  </span>
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform",
                      isSelected
                        ? "text-emerald-400 translate-x-0.5"
                        : "text-muted-foreground/40 group-hover:text-muted-foreground",
                    )}
                  />
                </div>

                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                  {phase.tagLine}
                </p>

                <div className="pt-1 font-mono text-[10px] text-muted-foreground/70">
                  {phase.checks.length} core checks
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
