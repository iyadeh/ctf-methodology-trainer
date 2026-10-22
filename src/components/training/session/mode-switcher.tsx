"use client";

import { useTransition } from "react";
import { Compass, Shield, Sparkles, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrainingSessionMode } from "@/modules/training/types";
import { switchSessionModeAction } from "@/app/training/[sessionId]/actions";

interface ModeSwitcherProps {
  readonly sessionId: string;
  readonly currentMode: TrainingSessionMode;
  readonly isCompleted?: boolean;
}

export function ModeSwitcher({
  sessionId,
  currentMode,
  isCompleted = false,
}: ModeSwitcherProps) {
  const [isPending, startTransition] = useTransition();

  const handleModeSwitch = (newMode: TrainingSessionMode) => {
    if (newMode === currentMode || isCompleted || isPending) return;

    startTransition(async () => {
      await switchSessionModeAction(sessionId, newMode);
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="inline-flex items-center rounded-lg border border-border bg-background/80 p-1 shadow-sm backdrop-blur-xs">
        <button
          type="button"
          onClick={() => handleModeSwitch("guided")}
          disabled={isCompleted || isPending}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-all",
            currentMode === "guided"
              ? "bg-primary/20 text-primary border border-primary/40 shadow-xs"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            isPending && "opacity-60 cursor-not-allowed",
          )}
          title="Guided Mode: Step-by-step milestone tasks with progressive hints."
        >
          <Compass className="h-3.5 w-3.5" />
          <span>Guided Mode</span>
          {currentMode === "guided" && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => handleModeSwitch("adventure")}
          disabled={isCompleted || isPending}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-all",
            currentMode === "adventure"
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-xs"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            isPending && "opacity-60 cursor-not-allowed",
          )}
          title="Adventure Mode: Black-box simulation without handholding or milestone questions."
        >
          <Swords className="h-3.5 w-3.5" />
          <span>Adventure Mode</span>
          {currentMode === "adventure" && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
        {currentMode === "guided" ? (
          <>
            <Sparkles className="h-3 w-3 text-primary shrink-0" />
            <span>Guided tasks active: Practice step-by-step with progressive checkpoints & hints.</span>
          </>
        ) : (
          <>
            <Shield className="h-3 w-3 text-amber-400 shrink-0" />
            <span>Adventure mode active: Real-world assessment with pure objective capture & relaxed gates.</span>
          </>
        )}
      </p>
    </div>
  );
}
