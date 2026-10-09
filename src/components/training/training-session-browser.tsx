"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  ChevronDown,
  Edit2,
  FileUp,
  MonitorCog,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  deleteSessionAction,
  renameSessionAction,
  resetSessionAction,
} from "@/app/training/[sessionId]/actions";
import type {
  TrainingSessionDemo,
  TrainingSessionStatus,
} from "@/components/training/training-sessions-demo-data";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const sessionFilters = ["All", "In Progress", "Paused", "Completed"] as const;
const sortOptions = [
  "Last Accessed",
  "Created Date",
  "Progress",
  "Name",
] as const;

type SessionFilter = (typeof sessionFilters)[number];
type SessionSort = (typeof sortOptions)[number];

const statusStyles: Record<TrainingSessionStatus, string> = {
  "In Progress": "border-primary/25 bg-primary/10 text-primary",
  Paused: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  Completed: "border-primary/20 bg-primary/5 text-primary",
  "Not Started": "border-border bg-muted/40 text-muted-foreground",
};

type TrainingSessionBrowserProps = {
  sessions: readonly TrainingSessionDemo[];
  initialQuery?: string;
};

function SessionStatusBadge({ status }: { status: TrainingSessionStatus }) {
  return (
    <Badge variant="outline" className={statusStyles[status]}>
      {status}
    </Badge>
  );
}

function TrainingSessionRow({ session }: { session: TrainingSessionDemo }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newName, setNewName] = useState(session.name);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
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

  const handleDelete = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await deleteSessionAction(session.id);
      if (!res.ok) {
        setErrorMessage(res.error);
      } else {
        setIsDeleteOpen(false);
      }
    });
  };

  const handleReset = () => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await resetSessionAction(session.id);
      if (!res.ok) {
        setErrorMessage(res.error);
      } else {
        setIsResetOpen(false);
      }
    });
  };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setErrorMessage(null);
    startTransition(async () => {
      const res = await renameSessionAction(session.id, trimmed);
      if (!res.ok) {
        setErrorMessage(res.error);
      } else {
        setIsRenameOpen(false);
      }
    });
  };

  return (
    <li className="px-4 py-4 sm:px-5">
      <article className="grid gap-4 xl:grid-cols-[minmax(18rem,1fr)_minmax(34rem,1.15fr)] xl:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-primary">
            <MonitorCog aria-hidden="true" className="size-4.5" strokeWidth={1.75} />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{session.name}</h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
              {session.description}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge
                variant="outline"
                className="bg-background/30 font-mono text-muted-foreground"
              >
                {session.methodology}
              </Badge>
              <Badge
                variant="outline"
                className="bg-background/30 text-muted-foreground"
              >
                {session.operatingSystem}
              </Badge>
              <Badge
                variant="outline"
                className="bg-background/30 text-muted-foreground"
              >
                {session.difficulty}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-[7rem_minmax(9rem,1fr)_8rem_auto] sm:items-center">
          <div className="self-start sm:self-center">
            <SessionStatusBadge status={session.status} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-mono font-semibold text-foreground">
                {session.progress}%
              </span>
            </div>
            <Progress
              value={session.progress}
              aria-label={`${session.name} session progress`}
              className="mt-1.5"
            />
            <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
              {session.taskProgress}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Last accessed
            </p>
            <p className="mt-1 text-xs font-medium text-foreground">
              {session.lastAccessed}
            </p>
          </div>

          <div className="flex items-center justify-end gap-1.5">
            <Link
              href={
                session.status === "Completed"
                  ? `/training/${session.id}/review`
                  : `/training/${session.id}`
              }
              aria-label={`${session.action} ${session.name} training`}
              className={cn(
                buttonVariants({
                  variant: session.status === "Completed" ? "outline" : "default",
                  size: "sm",
                }),
                "min-w-23",
              )}
            >
              {session.action}
              <ArrowRight
                aria-hidden="true"
                data-icon="inline-end"
                strokeWidth={1.75}
              />
            </Link>

            {/* Overflow Action Menu */}
            <div className="relative" ref={menuRef}>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${session.name} session options`}
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className={cn(isMenuOpen && "bg-muted text-foreground")}
              >
                <MoreHorizontal aria-hidden="true" strokeWidth={1.75} />
              </Button>

              {isMenuOpen && (
                <div
                  role="menu"
                  aria-label={`${session.name} options`}
                  className="absolute right-0 top-full mt-1.5 z-30 min-w-44 rounded-lg border border-border bg-popover p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100"
                >
                  <Link
                    href={`/training/${session.id}`}
                    role="menuitem"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                  >
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                    Open Workspace
                  </Link>

                  {session.status === "Completed" && (
                    <Link
                      href={`/training/${session.id}/review`}
                      role="menuitem"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                    >
                      <Sparkles className="size-3.5 text-primary" />
                      Session Review
                    </Link>
                  )}

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
      </article>

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

            {errorMessage && (
              <p className="mt-3 text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                {errorMessage}
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
                  Are you sure you want to restart <strong className="text-foreground">{session.name}</strong>?
                  Checklist progress will reset to Phase 1 (Pre-engagement Activities), and all findings, hypotheses, and hint records will be cleared.
                </p>
              </div>
            </div>

            {errorMessage && (
              <p className="mt-3 text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                {errorMessage}
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
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">
                Rename Training Session
              </h3>
              <button
                type="button"
                onClick={() => setIsRenameOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter a new name for this training session.
            </p>

            <form onSubmit={handleRename} className="mt-4 space-y-4">
              <Input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Session name"
                required
                autoFocus
              />

              {errorMessage && (
                <p className="text-xs text-destructive">{errorMessage}</p>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setIsRenameOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending || !newName.trim()}>
                  {isPending ? "Saving..." : "Save Name"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}

function sortSessions(
  sessions: readonly TrainingSessionDemo[],
  sortBy: SessionSort,
) {
  return [...sessions].sort((left, right) => {
    if (sortBy === "Created Date") {
      return left.createdOrder - right.createdOrder;
    }

    if (sortBy === "Progress") {
      return right.progress - left.progress;
    }

    if (sortBy === "Name") {
      return left.name.localeCompare(right.name);
    }

    return left.lastAccessedOrder - right.lastAccessedOrder;
  });
}

export function TrainingSessionBrowser({
  sessions,
  initialQuery = "",
}: TrainingSessionBrowserProps) {
  const [query, setQuery] = useState(initialQuery);
  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<SessionFilter>("All");
  const [sortBy, setSortBy] = useState<SessionSort>("Last Accessed");

  if (prevInitialQuery !== initialQuery) {
    setPrevInitialQuery(initialQuery);
    setQuery(initialQuery);
  }

  const visibleSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const matchingSessions = sessions.filter((session) => {
      const matchesFilter =
        activeFilter === "All" || session.status === activeFilter;
      const searchableText = [
        session.name,
        session.description,
        session.methodology,
        session.operatingSystem,
        session.difficulty,
        session.status,
      ]
        .join(" ")
        .toLocaleLowerCase();

      return matchesFilter && searchableText.includes(normalizedQuery);
    });

    return sortSessions(matchingSessions, sortBy);
  }, [activeFilter, query, sessions, sortBy]);

  function resetSearchAndFilters() {
    setQuery("");
    setActiveFilter("All");
  }

  // If there are 0 total sessions in the entire database, render the primary empty state
  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card px-5 py-14 text-center">
        <div className="flex size-12 mx-auto items-center justify-center rounded-lg border border-border bg-muted/40 text-primary">
          <FileUp className="size-6" strokeWidth={1.75} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          No training sessions yet
        </h3>
        <p className="mt-1.5 text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          Upload a machine writeup to begin your structured penetration testing practice guided by PTES methodology.
        </p>
        <Link
          href="/training/new"
          className={cn(buttonVariants({ size: "default" }), "mt-6 inline-flex items-center gap-2")}
        >
          <Plus className="size-4" strokeWidth={2} />
          Start New Training
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section
        aria-labelledby="session-tools-title"
        className="overflow-hidden rounded-lg border border-border bg-card"
      >
        <h2 id="session-tools-title" className="sr-only">
          Find and sort training sessions
        </h2>

        <div className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1 xl:max-w-md">
            <label htmlFor="training-session-search" className="sr-only">
              Search training sessions
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
            />
            <Input
              id="training-session-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search training sessions..."
              className="h-9 bg-background/30 pl-8"
            />
          </div>

          <div
            className="flex flex-wrap items-center gap-1"
            aria-label="Filter sessions by status"
          >
            {sessionFilters.map((filter) => {
              const isActive = activeFilter === filter;

              return (
                <Button
                  key={filter}
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={isActive}
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    "border border-transparent",
                    isActive &&
                      "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                  )}
                >
                  {filter}
                </Button>
              );
            })}
          </div>

          <Link
            href="/training/new"
            className={cn(buttonVariants({ size: "lg" }), "xl:ml-auto")}
          >
            <Plus aria-hidden="true" data-icon="inline-start" strokeWidth={1.75} />
            New Training
          </Link>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite" className="text-xs text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">
              {visibleSessions.length}
            </span>{" "}
            {visibleSessions.length === 1 ? "training session" : "training sessions"}
          </p>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Sort by:
            <span className="relative">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SessionSort)}
                className="h-8 appearance-none rounded-lg border border-input bg-background/40 py-1 pl-2.5 pr-8 text-xs font-medium text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {sortOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                strokeWidth={1.75}
              />
            </span>
          </label>
        </div>
      </section>

      <section aria-labelledby="training-session-list-title">
        <h2 id="training-session-list-title" className="sr-only">
          Training session list
        </h2>

        {visibleSessions.length > 0 ? (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {visibleSessions.map((session) => (
              <TrainingSessionRow key={session.id} session={session} />
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card px-5 py-10 text-center">
            <p className="text-sm font-medium text-foreground">
              No training sessions found.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Adjust your search or status filter to see more sessions.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetSearchAndFilters}
              className="mt-4"
            >
              Clear filters
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
