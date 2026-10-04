"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Flag, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeSessionAction } from "@/app/training/[sessionId]/actions";
import type { ObjectiveType } from "@/modules/training/completion";

interface CompleteSessionDialogProps {
  readonly sessionId: string;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuccess?: () => void;
}

const OBJECTIVE_OPTIONS: { id: ObjectiveType; label: string; desc: string }[] = [
  {
    id: "root_flag",
    label: "Root Flag",
    desc: "Target system compromise (/root/root.txt or SYSTEM)",
  },
  {
    id: "user_flag",
    label: "User Flag",
    desc: "Standard user foothold (/home/user/user.txt)",
  },
  {
    id: "challenge_objective",
    label: "Challenge Objective",
    desc: "CTF challenge goal or web application objective",
  },
  {
    id: "administrator",
    label: "Domain / Administrator",
    desc: "Domain Controller or full administrative control",
  },
  {
    id: "other",
    label: "Other Objective",
    desc: "Custom engagement or machine objective",
  },
];

export function CompleteSessionDialog({
  sessionId,
  isOpen,
  onClose,
  onSuccess,
}: CompleteSessionDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [objectiveType, setObjectiveType] = useState<ObjectiveType>("root_flag");
  const [objectiveEvidence, setObjectiveEvidence] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await completeSessionAction(sessionId, {
        objectiveType,
        objectiveEvidence: objectiveEvidence.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (!res.ok) {
        setError(res.error);
      } else {
        onClose();
        if (onSuccess) onSuccess();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Complete Machine Assessment
              </h3>
              <p className="text-xs text-muted-foreground">
                Finalize this engagement and unlock the writeup Reference Path.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Objective Type Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Objective Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {OBJECTIVE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setObjectiveType(opt.id)}
                  className={`flex flex-col items-start p-2.5 rounded border text-left transition-colors ${
                    objectiveType === opt.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/60 bg-muted/20 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    <Flag className="h-3 w-3 text-primary" />
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Objective Evidence / Flag */}
          <div className="space-y-1.5">
            <label
              htmlFor="objective-evidence"
              className="text-xs font-medium text-foreground"
            >
              Captured Flag or Proof of Compromise{" "}
              <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <input
              id="objective-evidence"
              type="text"
              value={objectiveEvidence}
              onChange={(e) => setObjectiveEvidence(e.target.value)}
              placeholder="e.g. BEECTF{...} or root@target:~# id"
              className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-[10px] text-muted-foreground">
              If provided, this objective will be saved as a confirmed finding in your session evidence.
            </p>
          </div>

          {/* Engagement Notes */}
          <div className="space-y-1.5">
            <label htmlFor="session-notes" className="text-xs font-medium text-foreground">
              Completion Notes & Reflections{" "}
              <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <textarea
              id="session-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key lessons, methodology observations, or challenges faced..."
              className="w-full rounded border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Notice Callout */}
          <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2.5">
            <Lock className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-0.5 text-[11px] leading-relaxed text-amber-200/90">
              <p className="font-semibold text-amber-300">Assessment Locking Notice</p>
              <p>
                Marking this session completed will lock the assessment into read-only mode.
                The writeup-derived <strong>Reference Attack Path</strong> will then become visible.
              </p>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive font-mono">{error}</p>
          )}

          {/* Dialog Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={isPending}
              className="text-xs gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isPending ? "Completing..." : "Confirm & Complete Machine"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
