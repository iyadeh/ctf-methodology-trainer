import { TrainingSessionBrowser } from "@/components/training/training-session-browser";
import { trainingSessionsDemoData } from "@/components/training/training-sessions-demo-data";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TrainingSessionsProps = {
  currentDate: string;
  currentDateTime: string;
};

const metricCellStyles = [
  "border-b border-r lg:border-b-0",
  "border-b lg:border-b-0 lg:border-r",
  "border-r",
  "",
] as const;

function TrainingSessionsHeader({
  currentDate,
  currentDateTime,
}: TrainingSessionsProps) {
  return (
    <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Training Sessions
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Continue or review your practice sessions. Track your progress across
          different machines and methodologies.
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

function SessionMetrics() {
  return (
    <Card role="region" aria-label="Training session summary" className="!gap-0 !py-0">
      <CardContent className="grid grid-cols-2 !p-0 lg:grid-cols-4">
        {trainingSessionsDemoData.metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={cn("p-4", metricCellStyles[index])}
          >
            <p className="font-mono text-2xl font-semibold tracking-tight text-foreground">
              {metric.value}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {metric.label}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {metric.description}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TrainingSessions({
  currentDate,
  currentDateTime,
}: TrainingSessionsProps) {
  return (
    <div className="space-y-4">
      <TrainingSessionsHeader
        currentDate={currentDate}
        currentDateTime={currentDateTime}
      />
      <SessionMetrics />
      <TrainingSessionBrowser sessions={trainingSessionsDemoData.sessions} />
    </div>
  );
}
