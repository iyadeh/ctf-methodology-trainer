import { ArrowRight, FileUp, MonitorCog, Play } from "lucide-react";
import Link from "next/link";
import {
  dashboardDemoData,
  type DashboardSessionStatus,
} from "@/components/dashboard/dashboard-demo-data";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type DashboardProps = {
  currentDate: string;
  currentDateTime: string;
};

const statusStyles: Record<DashboardSessionStatus, string> = {
  "In Progress": "border-primary/25 bg-primary/10 text-primary",
  Paused: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  Completed: "border-primary/20 bg-primary/5 text-primary",
};

const overviewCellStyles = [
  "border-b border-r lg:border-b-0",
  "border-b lg:border-b-0 lg:border-r",
  "border-r",
  "",
] as const;

function SessionStatusBadge({ status }: { status: DashboardSessionStatus }) {
  return (
    <Badge variant="outline" className={statusStyles[status]}>
      {status}
    </Badge>
  );
}

function DashboardSectionLink({
  children,
  href,
}: {
  children: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
    >
      {children}
      <ArrowRight
        aria-hidden="true"
        className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        strokeWidth={1.75}
      />
    </Link>
  );
}

function DashboardHeader({ currentDate, currentDateTime }: DashboardProps) {
  return (
    <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Continue your training, track your progress, and build your CTF skills.
        </p>
      </div>

      <div className="shrink-0 sm:border-l sm:border-border sm:pl-5 sm:text-right">
        <time
          dateTime={currentDateTime}
          className="font-mono text-xs font-medium text-foreground"
        >
          {currentDate}
        </time>
        <p className="mt-1.5 text-xs font-medium text-foreground">Keep learning.</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Small steps make big progress.
        </p>
      </div>
    </header>
  );
}

function ContinueTrainingCard() {
  const session = dashboardDemoData.featuredSession;

  return (
    <Card
      role="region"
      aria-labelledby="continue-training-title"
      className="h-full"
    >
      <CardHeader className="border-b border-border">
        <CardTitle id="continue-training-title">Continue Training</CardTitle>
        <CardAction>
          <SessionStatusBadge status={session.status} />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <MonitorCog aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {session.name}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {session.description}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {session.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="bg-background/30 text-muted-foreground"
            >
              {tag}
            </Badge>
          ))}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>
              <span className="font-mono font-semibold text-foreground">
                {session.progress}%
              </span>{" "}
              complete
            </span>
            <span>
              <span className="font-mono text-foreground">
                {session.completedPhases}
              </span>{" "}
              of{" "}
              <span className="font-mono text-foreground">
                {session.totalPhases}
              </span>{" "}
              phases
            </span>
          </div>
          <Progress
            value={session.progress}
            aria-label={`${session.name} training progress`}
            className="mt-2"
          />
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          <Link
            href="/training"
            aria-label={`Resume ${session.name} training`}
            className={buttonVariants({ size: "lg" })}
          >
            <Play aria-hidden="true" data-icon="inline-start" strokeWidth={1.75} />
            Resume
          </Link>
          <Link
            href="/training"
            aria-label={`View ${session.name} training details`}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            View Details
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function NewTrainingCard() {
  return (
    <Card role="region" aria-labelledby="new-training-title" className="h-full">
      <CardHeader className="border-b border-border">
        <CardTitle id="new-training-title">New Training</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-muted/40 text-primary">
          <FileUp aria-hidden="true" className="size-5" strokeWidth={1.75} />
        </div>
        <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
          Start a New Training
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Upload a machine writeup and turn it into a methodology-guided practice
          session.
        </p>

        <div className="mt-auto space-y-3 pt-6">
          <Link
            href="/training/new"
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
          >
            Upload Writeup
            <ArrowRight aria-hidden="true" data-icon="inline-end" strokeWidth={1.75} />
          </Link>
          <DashboardSectionLink href="/methodology">
            Explore methodology
          </DashboardSectionLink>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentSessionsCard() {
  return (
    <Card
      role="region"
      aria-labelledby="recent-sessions-title"
      className="h-full"
    >
      <CardHeader className="border-b border-border">
        <CardTitle id="recent-sessions-title">Recent Sessions</CardTitle>
        <CardAction>
          <DashboardSectionLink href="/training">View All</DashboardSectionLink>
        </CardAction>
      </CardHeader>

      <CardContent>
        <ul className="divide-y divide-border">
          {dashboardDemoData.recentSessions.map((session) => (
            <li key={session.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {session.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {session.lastAccessed}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <SessionStatusBadge status={session.status} />
                  <span className="w-9 text-right font-mono text-xs font-semibold text-foreground">
                    {session.progress}%
                  </span>
                </div>
              </div>
              <Progress
                value={session.progress}
                aria-label={`${session.name} session progress`}
                className="mt-2.5"
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function MethodologyProgressCard() {
  return (
    <Card
      role="region"
      aria-labelledby="methodology-progress-title"
      className="h-full"
    >
      <CardHeader className="border-b border-border">
        <CardTitle id="methodology-progress-title">Methodology Progress</CardTitle>
        <CardAction>
          <DashboardSectionLink href="/methodology">View Methodology</DashboardSectionLink>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3.5">
        {dashboardDemoData.methodologyProgress.map((phase) => (
          <div key={phase.name}>
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="truncate text-muted-foreground">{phase.name}</span>
              <span className="shrink-0 font-mono font-semibold text-foreground">
                {phase.progress}%
              </span>
            </div>
            <Progress
              value={phase.progress}
              aria-label={`${phase.name} methodology progress`}
              className="mt-1.5"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TrainingOverviewCard() {
  return (
    <Card
      role="region"
      aria-labelledby="training-overview-title"
      className="!gap-0 !py-0"
    >
      <CardHeader className="border-b border-border !p-4">
        <CardTitle id="training-overview-title">Training Overview</CardTitle>
      </CardHeader>

      <CardContent className="grid grid-cols-2 !p-0 lg:grid-cols-4">
        {dashboardDemoData.overview.map((metric, index) => (
          <div
            key={metric.label}
            className={cn("p-4", overviewCellStyles[index])}
          >
            <p className="font-mono text-2xl font-semibold tracking-tight text-foreground">
              {metric.value}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{metric.label}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {metric.description}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function Dashboard({ currentDate, currentDateTime }: DashboardProps) {
  return (
    <div className="space-y-4">
      <DashboardHeader
        currentDate={currentDate}
        currentDateTime={currentDateTime}
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <ContinueTrainingCard />
        </div>
        <div className="xl:col-span-4">
          <NewTrainingCard />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <RecentSessionsCard />
        </div>
        <div className="xl:col-span-4">
          <MethodologyProgressCard />
        </div>
      </div>

      <TrainingOverviewCard />
    </div>
  );
}
