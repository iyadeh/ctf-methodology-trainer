import { ShieldCheck, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { SessionContextWithEvidence } from "@/modules/context/types";

interface ContextPanelProps {
  readonly context: readonly SessionContextWithEvidence[];
}

export function ContextPanel({ context }: ContextPanelProps) {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Active Canonical Context ({context.length})
        </h2>
        <p className="text-xs text-muted-foreground">
          Canonical context tags derived exclusively from confirmed user evidence. These drive dynamic playbook activation.
        </p>
      </div>

      {context.length === 0 ? (
        <Card className="border-dashed text-center">
          <CardContent className="py-12">
            <p className="text-sm text-muted-foreground">
              No active canonical context yet. Confirm findings to derive context tags.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {context.map((entry) => (
            <Card key={entry.id} className="border-border/80 bg-card/60">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {entry.canonicalKey}
                    </span>
                  </div>
                  <Badge variant="default" className="font-mono text-[10px] capitalize">
                    {entry.state}
                  </Badge>
                </div>

                <div className="border-t border-border/40 pt-2 space-y-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                    Supporting Evidence ({entry.observations.length})
                  </span>
                  <ul className="space-y-1">
                    {entry.observations.map((obs) => (
                      <li
                        key={obs.id}
                        className="rounded bg-background/50 p-2 font-mono text-[11px] text-foreground/90 flex justify-between items-center"
                      >
                        <span>
                          {obs.sourceKind}: <span className="font-semibold">{obs.sourceValue}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Finding #{obs.findingId.slice(0, 8)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
