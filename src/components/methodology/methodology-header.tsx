import { Sparkles, Waypoints } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface MethodologyHeaderProps {
  readonly frameworkName: string;
  readonly description: string;
  readonly totalPhases: number;
  readonly totalChecks: number;
}

export function MethodologyHeader({
  frameworkName,
  description,
  totalPhases,
  totalChecks,
}: MethodologyHeaderProps) {
  return (
    <div className="border-b border-border bg-card/60 px-6 py-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left: Framework Intro */}
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Waypoints className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Methodology
                </h1>
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 bg-emerald-500/10 font-mono text-xs text-emerald-300"
                >
                  {frameworkName}
                </Badge>
              </div>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>

          <div className="flex items-center gap-3 pt-1">
            <span className="font-mono text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {totalPhases} Sequential Phases
            </span>
            <span className="text-border">•</span>
            <span className="font-mono text-xs text-muted-foreground">
              {totalChecks} Standard Verification Checks
            </span>
            <span className="text-border">•</span>
            <span className="font-mono text-xs text-muted-foreground">
              Evidence-Led Progression
            </span>
          </div>
        </div>

        {/* Right Info Card */}
        <Card className="p-4 border-border bg-card/90 lg:max-w-xs shrink-0 space-y-2">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Structured. Practical. Effective.</span>
          </div>
          <p className="text-xs text-muted-foreground leading-normal">
            A battle-tested methodology adapted for hands-on CTF learning. 
            Method before exploit, evidence before action.
          </p>
        </Card>
      </div>
    </div>
  );
}
