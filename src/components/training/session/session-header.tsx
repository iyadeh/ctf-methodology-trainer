"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Lock,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { TrainingSessionAggregate } from "@/modules/training/types";
import {
  deleteSessionAction,
  pauseSessionAction,
  renameSessionAction,
  resetSessionAction,
  resumeSessionAction,
  setTargetIpAction,
  startSessionAction,
} from "@/app/training/[sessionId]/actions";
import { CompleteSessionDialog } from "./complete-session-dialog";
import { ModeSwitcher } from "./mode-switcher";

interface SessionHeaderProps {
  readonly aggregate: TrainingSessionAggregate;
}

export function SessionHeader({ aggregate }: SessionHeaderProps) {
  const router = useRouter();
  const { session, progress, currentPhase } = aggregate;
  const [isPending, startTransition] = useTransition();
  const [isEditingIp, setIsEditingIp] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState(session.name);
  const [ipValue, setIpValue] = useState(session.targetIp ?? "");
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isCompleted = session.status === "completed";

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const handleIpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCompleted) return;
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

  const handleDelete = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await deleteSessionAction(session.id);
      if (!res.ok) {
        setActionError(res.error);
      } else {
        setIsDeleteOpen(false);
        router.push("/training");
      }
    });
  };

  const handleReset = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await resetSessionAction(session.id);
      if (!res.ok) {
        setActionError(res.error);
      } else {
        setIsResetOpen(false);
        router.refresh();
      }
    });
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setActionError(null);
    startTransition(async () => {
      const res = await renameSessionAction(session.id, trimmed);
      if (!res.ok) {
        setActionError(res.error);
      } else {
        setIsRenameOpen(false);
        router.refresh();
      }
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
            {isCompleted ? (
              <>
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-mono text-[11px] gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Completed
                </Badge>
                <Badge
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-400 font-mono text-[11px] gap-1"
                >
                  <Lock className="h-3 w-3" />
                  Locked
                </Badge>
              </>
            ) : (
              <Badge
                variant={
                  session.status === "in_progress"
                    ? "default"
                    : "outline"
                }
                className="font-mono text-[11px] capitalize"
              >
                {session.status.replace("_", " ")}
              </Badge>
            )}
            {currentPhase && (
              <Badge variant="outline" className="border-primary/40 text-primary font-mono text-[11px]">
                {currentPhase.name}
              </Badge>
            )}
            {aggregate.deviations && aggregate.deviations.length > 0 && (
              <Badge
                variant="outline"
                className="border-amber-500/50 bg-amber-500/10 text-amber-400 font-mono text-[11px] gap-1"
                title={`${aggregate.deviations.length} methodology deviation(s) recorded: Phase gate was overridden without completing all required checks.`}
              >
                <AlertTriangle className="h-3 w-3" />
                <span>
                  {aggregate.deviations.length} Override
                  {aggregate.deviations.length > 1 ? "s" : ""}
                </span>
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
            {!isCompleted && isEditingIp ? (
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
                onClick={() => {
                  if (!isCompleted) setIsEditingIp(true);
                }}
                disabled={isCompleted}
                className="group flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-xs text-foreground hover:bg-muted disabled:hover:bg-transparent"
                title={isCompleted ? "Session completed (locked)" : "Click to edit Target IP"}
              >
                <span className={session.targetIp ? "font-semibold text-primary" : "italic text-muted-foreground"}>
                  {session.targetIp ?? "Not specified (click to set)"}
                </span>
              </button>
            )}
            {error && <span className="text-xs text-destructive">{error}</span>}
          </div>

          {/* Mode Switcher: Guided vs Adventure */}
          <div className="mt-3.5">
            <ModeSwitcher
              sessionId={session.id}
              currentMode={session.mode}
              isCompleted={isCompleted}
            />
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
              <>
                <Button onClick={handlePause} disabled={isPending} variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Pause className="h-3.5 w-3.5" />
                  Pause
                </Button>
                <Button
                  onClick={() => setIsCompleteOpen(true)}
                  disabled={isPending}
                  size="sm"
                  className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Complete Machine
                </Button>
              </>
            )}
            {session.status === "paused" && (
              <>
                <Button onClick={handleResume} disabled={isPending} size="sm" className="gap-1.5 text-xs">
                  <Play className="h-3.5 w-3.5" />
                  Resume
                </Button>
                <Button
                  onClick={() => setIsCompleteOpen(true)}
                  disabled={isPending}
                  size="sm"
                  className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Complete Machine
                </Button>
              </>
            )}
            {isCompleted && session.completedAt && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-[11px] text-muted-foreground">
                  Completed on {new Date(session.completedAt).toLocaleDateString()}{" "}
                  {new Date(session.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <Link href={`/training/${session.id}/review`}>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs font-mono border-primary/40 text-primary hover:bg-primary/10">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Session Review →
                  </Button>
                </Link>
              </div>
            )}

            {/* Overflow Action Menu */}
            <div className="relative" ref={menuRef}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Session actions"
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className={cn("h-8 w-8 p-0", isMenuOpen && "bg-muted text-foreground")}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>

              {isMenuOpen && (
                <div
                  role="menu"
                  aria-label="Session actions"
                  className="absolute right-0 top-full mt-1.5 z-30 min-w-44 rounded-lg border border-border bg-popover p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsRenameOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted text-left"
                  >
                    <Edit2 className="size-3.5 text-muted-foreground" />
                    Rename Session
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsResetOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted text-left"
                  >
                    <RotateCcw className="size-3.5 text-amber-400" />
                    Restart Session
                  </button>

                  <div className="my-1 border-t border-border" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsDeleteOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10 text-left font-medium"
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                    Delete Session
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CompleteSessionDialog
        sessionId={session.id}
        isOpen={isCompleteOpen}
        onClose={() => setIsCompleteOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-destructive/30 bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Delete Training Session
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-foreground">{session.name}</strong>?
                  All findings, checklist progress, hypotheses, and notes for this machine will be permanently removed.
                </p>
              </div>
            </div>

            {actionError && (
              <p className="mt-3 text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                {actionError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setIsDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={handleDelete}
              >
                {isPending ? "Deleting..." : "Delete Session"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Restart Confirmation Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-amber-500/30 bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <RotateCcw className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Restart Training Session
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  Resetting <strong className="text-foreground">{session.name}</strong> will return the methodology to Phase 1 (Reconnaissance). All logged findings, hypotheses, attempts, deviations, and checklist items will be cleared so you can practice this machine afresh.
                </p>
              </div>
            </div>

            {actionError && (
              <p className="mt-3 text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                {actionError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setIsResetOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={isPending}
                onClick={handleReset}
                className="bg-amber-600 hover:bg-amber-500 text-white"
              >
                {isPending ? "Restarting..." : "Restart Session"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {isRenameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground">
                  <Edit2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Rename Training Session
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enter a new display name for this machine session.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRenameOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleRename} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground">Session Name</label>
                <Input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Cap, Beep, Baseme..."
                  className="mt-1 font-mono text-sm"
                  autoFocus
                />
              </div>

              {actionError && (
                <p className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                  {actionError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setIsRenameOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || !newName.trim()}
                >
                  {isPending ? "Saving..." : "Save Name"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
