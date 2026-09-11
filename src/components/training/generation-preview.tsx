import { ArrowRight, Check, Circle, CircleAlert, Clock3, RotateCcw } from "lucide-react";
import {
  generationPreviewPresets,
  generationPreviewSteps,
  type GenerationPreviewState,
  type PreviewStepStatus,
} from "@/components/training/generation-preview-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const stepPresentation = {
  completed: { label: "Completed", icon: Check, className: "text-primary" },
  "in-progress": { label: "In Progress", icon: Clock3, className: "text-primary" },
  pending: { label: "Pending", icon: Circle, className: "text-muted-foreground" },
  failed: { label: "Failed", icon: CircleAlert, className: "text-destructive" },
} satisfies Record<PreviewStepStatus, { label: string; icon: typeof Check; className: string }>;

type GenerationPreviewProps = {
  state: GenerationPreviewState;
  onChange: (state: GenerationPreviewState) => void;
  onReplaceFile: () => void;
};

export function GenerationPreview({ state, onChange, onReplaceFile }: GenerationPreviewProps) {
  const preset = generationPreviewPresets[state];

  return (
    <Card role="region" aria-labelledby="generation-preview-title" className="xl:col-span-2">
      <CardHeader className="border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Local UI preview</p>
            <h2 id="generation-preview-title" aria-live="polite" className="text-base font-medium">{preset.title}</h2>
          </div>
          <div role="group" aria-label="Preview generation state" className="flex flex-wrap gap-1">
            {(Object.keys(generationPreviewPresets) as GenerationPreviewState[]).map((previewState) => (
              <Button key={previewState} type="button" size="sm" variant="ghost"
                aria-pressed={state === previewState}
                onClick={() => onChange(previewState)}
                className={cn(state === previewState && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary")}
              >
                {generationPreviewPresets[previewState].label}
              </Button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Preview only. Change the state above to inspect each outcome. Your file has not been processed and no session exists.
        </p>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-x-6 gap-y-4 lg:grid-cols-2 xl:grid-cols-3">
          {generationPreviewSteps.map((step, index) => {
            const status = preset.statuses[index];
            const presentation = stepPresentation[status];
            const Icon = presentation.icon;
            return (
              <li key={step.title} aria-current={status === "in-progress" ? "step" : undefined} className="flex gap-3">
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background/30", presentation.className)}>
                  <Icon aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="text-sm font-medium">{step.title}</h3>
                  <p className={cn("mt-0.5 text-xs", presentation.className)}>{presentation.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
      {state === "failed" && (
        <CardFooter className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
          <p role="status" className="text-xs leading-5 text-muted-foreground">
            Failure preview. Your selected file is still available. Retry previews processing again, or choose a different file.
          </p>
          <div className="flex shrink-0 gap-2">
            <Button type="button" size="sm" onClick={() => onChange("processing")}>
              <RotateCcw aria-hidden="true" strokeWidth={1.75} />Retry
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onReplaceFile}>Replace File</Button>
          </div>
        </CardFooter>
      )}
      {state === "ready" && (
        <CardFooter className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
          <p id="start-training-unavailable" role="status" className="text-xs leading-5 text-muted-foreground">
            Ready-state preview only. Starting training requires a generated session, which is unavailable in this UI preview.
          </p>
          <Button type="button" size="sm" disabled aria-describedby="start-training-unavailable">
            Start Training<ArrowRight aria-hidden="true" strokeWidth={1.75} />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
