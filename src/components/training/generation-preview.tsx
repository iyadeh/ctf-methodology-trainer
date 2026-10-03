import Link from "next/link";
import {
  ArrowRight,
  Check,
  Circle,
  CircleAlert,
  Clock3,
  Monitor,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  generationPreviewPresets,
  generationPreviewSteps,
  type GenerationPreviewState,
  type PreviewStepStatus,
} from "@/components/training/generation-preview-data";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const stepPresentation = {
  completed: { label: "Completed", icon: Check, className: "text-primary" },
  "in-progress": { label: "In Progress", icon: Clock3, className: "text-primary" },
  pending: { label: "Pending", icon: Circle, className: "text-muted-foreground" },
  failed: { label: "Failed", icon: CircleAlert, className: "text-destructive" },
} satisfies Record<PreviewStepStatus, { label: string; icon: typeof Check; className: string }>;

export type GenerationPreviewProps = {
  state: GenerationPreviewState;
  onChange?: (state: GenerationPreviewState) => void;
  onReplaceFile: () => void;
  isLive?: boolean;
  sessionId?: string;
  errorMessage?: string;
  machineProfile?: {
    name: string;
    platform: string;
    os: string;
    difficulty: string;
    author?: string;
    targetIp?: string;
  };
  onRetry?: () => void;
};

export function GenerationPreview({
  state,
  onChange,
  onReplaceFile,
  isLive = false,
  sessionId,
  errorMessage,
  machineProfile,
  onRetry,
}: GenerationPreviewProps) {
  const preset = generationPreviewPresets[state];

  return (
    <Card role="region" aria-labelledby="generation-preview-title" className="xl:col-span-2">
      <CardHeader className="border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {isLive ? "Generation Pipeline" : "Local UI preview"}
              </span>
              {isLive && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] uppercase font-mono tracking-wider",
                    state === "ready" && "border-primary/40 bg-primary/10 text-primary",
                    state === "failed" && "border-destructive/40 bg-destructive/10 text-destructive",
                    state === "processing" && "border-primary/40 text-primary animate-pulse",
                  )}
                >
                  {state}
                </Badge>
              )}
            </div>
            <h2 id="generation-preview-title" aria-live="polite" className="text-base font-medium mt-0.5">
              {preset.title}
            </h2>
          </div>

          {!isLive && onChange && (
            <div role="group" aria-label="Preview generation state" className="flex flex-wrap gap-1">
              {(Object.keys(generationPreviewPresets) as GenerationPreviewState[]).map((previewState) => (
                <Button
                  key={previewState}
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-pressed={state === previewState}
                  onClick={() => onChange(previewState)}
                  className={cn(
                    state === previewState &&
                      "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                  )}
                >
                  {generationPreviewPresets[previewState].label}
                </Button>
              ))}
            </div>
          )}
        </div>

        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {isLive
            ? state === "ready"
              ? "Training session successfully initialized with PTES methodology. All solution details remain securely hidden."
              : state === "failed"
                ? errorMessage || "Verification checks encountered fatal issues in the attack path."
                : "Orchestrating writeup parsing, fact extraction, attack graph modeling, and automated verification..."
            : "Preview only. Change the state above to inspect each outcome."}
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        <ol className="grid gap-x-6 gap-y-4 lg:grid-cols-2 xl:grid-cols-3">
          {generationPreviewSteps.map((step, index) => {
            const status = preset.statuses[index];
            const presentation = stepPresentation[status];
            const Icon = presentation.icon;
            return (
              <li
                key={step.title}
                aria-current={status === "in-progress" ? "step" : undefined}
                className="flex gap-3"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background/30",
                    presentation.className,
                  )}
                >
                  <Icon aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="text-sm font-medium">{step.title}</h3>
                  <p className={cn("mt-0.5 text-xs", presentation.className)}>
                    {presentation.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        {isLive && state === "ready" && machineProfile && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-xs">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Monitor className="size-4 text-primary" />
              <span>Target Machine Profile Initialized</span>
              <Badge variant="outline" className="ml-auto font-mono text-[10px] uppercase text-primary border-primary/30">
                {machineProfile.difficulty}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 text-muted-foreground">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground/80">Target Name</span>
                <span className="font-medium text-foreground text-sm">{machineProfile.name}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground/80">OS / Platform</span>
                <span className="font-medium text-foreground capitalize">
                  {machineProfile.os} ({machineProfile.platform})
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground/80">Target IP</span>
                <span className="font-mono font-medium text-foreground">
                  {machineProfile.targetIp || "To be discovered"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground/80">Methodology</span>
                <span className="font-medium text-primary flex items-center gap-1">
                  <ShieldCheck className="size-3 text-primary" /> PTES CTF Adapted
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {state === "failed" && (
        <CardFooter className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
          <p role="status" className="text-xs leading-5 text-destructive">
            {errorMessage || "Generation failed. Your selected file is still available. You can retry or choose a different writeup."}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onRetry || (() => onChange?.("processing"))}
            >
              <RotateCcw aria-hidden="true" strokeWidth={1.75} />
              Retry
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onReplaceFile}>
              Replace File
            </Button>
          </div>
        </CardFooter>
      )}

      {state === "ready" && (
        <CardFooter className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
          <p id="start-training-ready" role="status" className="text-xs leading-5 text-muted-foreground">
            {sessionId
              ? "Your session is ready. You can now enter the training room to begin practice."
              : "Ready-state preview only. Starting training requires a generated session."}
          </p>
          {sessionId ? (
            <Link
              href={`/training/${sessionId}`}
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              Enter Training Session
              <ArrowRight aria-hidden="true" className="ml-1 size-3.5" strokeWidth={1.75} />
            </Link>
          ) : (
            <Button type="button" size="sm" disabled aria-describedby="start-training-ready">
              Start Training
              <ArrowRight aria-hidden="true" strokeWidth={1.75} />
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
