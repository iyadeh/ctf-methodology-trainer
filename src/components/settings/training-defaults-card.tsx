"use client";

import { useState } from "react";
import { CheckCircle2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { saveTrainingDefaultsAction } from "@/modules/settings/actions";
import type {
  HintBehaviorOption,
  SpoilerLevelOption,
  TrainingDefaultsSettings,
} from "@/modules/settings/types";

interface TrainingDefaultsCardProps {
  readonly initialDefaults: TrainingDefaultsSettings;
}

export function TrainingDefaultsCard({
  initialDefaults,
}: TrainingDefaultsCardProps) {
  const [spoilerLevel, setSpoilerLevel] = useState<SpoilerLevelOption>(
    initialDefaults.defaultSpoilerLevel,
  );
  const [hintBehavior, setHintBehavior] = useState<HintBehaviorOption>(
    initialDefaults.hintBehavior,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedFeedback(false);

    try {
      await saveTrainingDefaultsAction({
        defaultSpoilerLevel: spoilerLevel,
        hintBehavior,
      });
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-6 border-border bg-card space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-400" />
          <h3 className="font-mono text-sm font-bold text-foreground">
            Training Defaults
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Set your preferred defaults for newly generated or initialized training sessions.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Framework (Read-only for PTES MVP) */}
        <div className="space-y-1.5">
          <label className="font-mono text-xs text-muted-foreground">
            Methodology Framework
          </label>
          <div className="flex h-9 items-center justify-between rounded-md border border-input bg-background/50 px-3 font-mono text-xs text-foreground">
            <span>{initialDefaults.frameworkName}</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              Canonical Default
            </span>
          </div>
        </div>

        {/* Spoiler Level */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-mono text-xs text-muted-foreground">
              Default Spoiler Level
            </label>
            <span className="font-mono text-[10px] text-muted-foreground">
              Stage 21 Policy
            </span>
          </div>
          <select
            value={spoilerLevel}
            onChange={(e) => setSpoilerLevel(e.target.value as SpoilerLevelOption)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="methodology_only">
              Methodology Only (Zero spoilers — framework guidance only)
            </option>
            <option value="directional">
              Directional Guidance (High-level hints without exact commands)
            </option>
            <option value="sub_objective">
              Sub-Objective Reveal (Allows specific next-step suggestions)
            </option>
          </select>
        </div>

        {/* Hint Behavior */}
        <div className="space-y-1.5">
          <label className="font-mono text-xs text-muted-foreground">
            Hint Progression Behavior
          </label>
          <select
            value={hintBehavior}
            onChange={(e) => setHintBehavior(e.target.value as HintBehaviorOption)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="progressive">
              Progressive Hints (Level 1 Conceptual → Level 2 Directional → Level 3 Specific)
            </option>
            <option value="strict">
              Strict Mode (Conceptual questions only, minimizes hints count)
            </option>
            <option value="on_demand">
              On-Demand Only (No unsolicited mentor nudges)
            </option>
          </select>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1.5">
            {savedFeedback && (
              <span className="flex items-center gap-1 font-mono text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Defaults saved!
              </span>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={isSaving}
            className="font-mono text-xs"
          >
            {isSaving ? "Saving..." : "Save Defaults"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
