import { BookOpen, ShieldCheck } from "lucide-react";

interface KnowledgeHeaderProps {
  readonly totalItems: number;
  readonly formattedDate?: string;
}

export function KnowledgeHeader({ totalItems, formattedDate }: KnowledgeHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border bg-card/60 px-6 py-5 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <BookOpen className="h-4 w-4" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Knowledge Base
          </h1>
          <span className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {totalItems} entries
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Reusable service playbooks, techniques, and privilege-escalation references.
        </p>
      </div>

      <div className="flex flex-col items-start text-left md:items-end md:text-right">
        <div className="flex items-center gap-1.5 font-mono text-xs text-foreground/80">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>{formattedDate || "Methodology Reference"}</span>
        </div>
        <p className="font-mono text-xs italic text-muted-foreground">
          Knowledge turns experience into advantage.
        </p>
      </div>
    </div>
  );
}
