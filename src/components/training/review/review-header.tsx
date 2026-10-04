import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TrainingSessionRecord } from "@/modules/training/types";

interface ReviewHeaderProps {
  readonly session: TrainingSessionRecord;
}

export function ReviewHeader({ session }: ReviewHeaderProps) {
  const completedDate = session.completedAt ? new Date(session.completedAt) : null;
  const formattedDate = completedDate
    ? completedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Unknown date";
  const formattedTime = completedDate
    ? completedDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <header className="border-b border-border bg-card px-4 py-5 sm:px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground mb-3">
        <Link href="/training" className="hover:text-foreground transition-colors">
          Training Sessions
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link
          href={`/training/${session.id}`}
          className="hover:text-foreground transition-colors truncate max-w-[200px]"
        >
          {session.name}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-semibold">Session Review</span>
      </nav>

      {/* Main Title Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {session.name}
            </h1>
            <Badge
              variant="outline"
              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-mono text-xs font-semibold"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Completed
            </Badge>
          </div>

          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Session completed on {formattedDate} at {formattedTime}.
          </p>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Great work! You completed the machine. Here is a detailed evaluation of your methodology, attack path, and performance.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/training/${session.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5 font-mono text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              Workspace
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
