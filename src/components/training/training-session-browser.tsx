"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  MonitorCog,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
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
};

function SessionStatusBadge({ status }: { status: TrainingSessionStatus }) {
  return (
    <Badge variant="outline" className={statusStyles[status]}>
      {status}
    </Badge>
  );
}

function TrainingSessionRow({ session }: { session: TrainingSessionDemo }) {
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
              href="/training"
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
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled
              aria-label={`${session.name} session actions are unavailable in this stage`}
              title="Session actions are unavailable in this stage"
            >
              <MoreHorizontal aria-hidden="true" strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      </article>
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

export function TrainingSessionBrowser({ sessions }: TrainingSessionBrowserProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<SessionFilter>("All");
  const [sortBy, setSortBy] = useState<SessionSort>("Last Accessed");

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
