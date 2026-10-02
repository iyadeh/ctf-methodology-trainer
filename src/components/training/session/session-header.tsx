"use client";

import { useState, useTransition } from "react";
import { Pause, Play, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { TrainingSessionAggregate } from "@/modules/training/types";
import {
  pauseSessionAction,
  resumeSessionAction,
  setTargetIpAction,
  startSessionAction,
} from "@/app/training/[sessionId]/actions";

interface SessionHeaderProps {
  readonly aggregate: TrainingSessionAggregate;
}

export function SessionHeader({ aggregate }: SessionHeaderProps) {
  const { session, progress, currentPhase } = aggregate;
  const [isPending, startTransition] = useTransition();
  const [isEditingIp, setIsEditingIp] = useState(false);
  const [ipValue, setIpValue] = useState(session.targetIp ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleIpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = ipValue.trim();
    if (!trimmed) {
      setError("Target IP must be a valid IPv4 or IPv6 address.");
      return;
    }
    startTransition(async () => {
      const res = await setTargetIpAction(session.id, trimmed);
      if (!res.ok) {
        setError(res.error);
      } else {
        setIsEditingIp(false);
      }
    });
  };

  const handleStart = () => {
    startTransition(async () => {
      await startSessionAction(session.id);
    });
  };

  const handlePause = () => {
    startTransition(async () => {
      await pauseSessionAction(session.id);
    });
  };

  const handleResume = () => {
    startTransition(async () => {
      await resumeSessionAction(session.id);
    });
  };

  return (
    <header className="border-b border-border bg-card/60 p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-semibold text-muted-foreground uppercase">
              Training Session
            </span>
            <span className="text-muted-foreground">•</span>
            <Badge
              variant={
                session.status === "in_progress"
                  ? "default"
                  : session.status === "completed"
                    ? "secondary"
                    : "outline"
              }
              className="font-mono text-[11px] capitalize"
            >
              {session.status.replace("_", " ")}
            </Badge>
            {currentPhase && (
              <Badge variant="outline" className="border-primary/40 text-primary font-mono text-[11px]">
                {currentPhase.name}
              </Badge>
            )}
          </div>

          <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {session.name}
          </h1>

          {/* Target IP */}
          <div className="mt-2.5 flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-xs text-muted-foreground">Target IP:</span>
            {isEditingIp ? (
              <form onSubmit={handleIpSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={ipValue}
                  onChange={(e) => setIpValue(e.target.value)}
                  placeholder="e.g. 192.168.1.100"
                  className="h-7 w-44 rounded border border-border bg-background px-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
                <Button type="submit" size="sm" variant="default" disabled={isPending} className="h-7 text-xs">
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingIp(false)}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingIp(true)}
                className="group flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-xs text-foreground hover:bg-muted"
                title="Click to edit Target IP"
              >
                <span className={session.targetIp ? "font-semibold text-primary" : "italic text-muted-foreground"}>
                  {session.targetIp ?? "Not specified (click to set)"}
                </span>
              </button>
            )}
            {error && <span className="text-xs text-destructive">{error}</span>}
          </div>
        </div>

        {/* Progress and controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:gap-6">
          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
            <div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-mono text-muted-foreground">Core Progress:</span>
                <span className="font-mono font-semibold text-foreground">
                  {progress.required.percentage}%
                </span>
              </div>
              <Progress value={progress.required.percentage} className="mt-1.5 h-1.5 w-32" />
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-mono text-muted-foreground">Coverage:</span>
                <span className="font-mono font-semibold text-foreground">
                  {progress.coverage.percentage}%
                </span>
              </div>
              <Progress value={progress.coverage.percentage} className="mt-1.5 h-1.5 w-32" />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {session.status === "not_started" && (
              <Button onClick={handleStart} disabled={isPending} size="sm" className="gap-1.5 text-xs font-medium">
                <Play className="h-3.5 w-3.5" />
                Start Training
              </Button>
            )}
            {session.status === "in_progress" && (
              <Button onClick={handlePause} disabled={isPending} variant="outline" size="sm" className="gap-1.5 text-xs">
                <Pause className="h-3.5 w-3.5" />
                Pause
              </Button>
            )}
            {session.status === "paused" && (
              <Button onClick={handleResume} disabled={isPending} size="sm" className="gap-1.5 text-xs">
                <Play className="h-3.5 w-3.5" />
                Resume
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
