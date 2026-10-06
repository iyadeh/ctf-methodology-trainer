import { Cpu, ShieldCheck } from "lucide-react";

interface SettingsHeaderProps {
  readonly formattedDate?: string;
}

export function SettingsHeader({ formattedDate }: SettingsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border bg-card/60 px-6 py-6 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Cpu className="h-4 w-4" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure the application to match your workflow, preferences, and security boundaries.
        </p>
      </div>

      <div className="flex flex-col items-start text-left md:items-end md:text-right">
        <div className="flex items-center gap-1.5 font-mono text-xs text-foreground/80">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>{formattedDate || "System Preferences"}</span>
        </div>
        <p className="font-mono text-xs italic text-muted-foreground">
          Good tools make great hackers.
        </p>
      </div>
    </div>
  );
}
