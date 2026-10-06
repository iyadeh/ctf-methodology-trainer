"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { saveInterfacePreferencesAction } from "@/modules/settings/actions";
import type {
  DensityOption,
  InterfaceSettings,
  ThemeOption,
} from "@/modules/settings/types";

const LOCAL_STORAGE_THEME_KEY = "ctf-methodology-theme";
const LOCAL_STORAGE_DENSITY_KEY = "ctf-methodology-density";
const LOCAL_STORAGE_MOTION_KEY = "ctf-methodology-reduced-motion";

interface InterfacePreferencesCardProps {
  readonly initialInterface?: InterfaceSettings;
}

export function InterfacePreferencesCard({
  initialInterface,
}: InterfacePreferencesCardProps) {
  const [theme, setTheme] = useState<ThemeOption>(
    initialInterface?.theme || "dark",
  );
  const [density, setDensity] = useState<DensityOption>(
    initialInterface?.density || "comfortable",
  );
  const [reducedMotion, setReducedMotion] = useState<boolean>(
    initialInterface?.reducedMotion ?? false,
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Sync DOM with current density on mount & changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-density", density);
      if (reducedMotion) {
        document.documentElement.classList.add("reduced-motion");
      } else {
        document.documentElement.classList.remove("reduced-motion");
      }
    }
  }, [density, reducedMotion]);

  const handleDensityChange = (newDensity: DensityOption) => {
    setDensity(newDensity);
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-density", newDensity);
      try {
        localStorage.setItem(LOCAL_STORAGE_DENSITY_KEY, newDensity);
      } catch {
        // ignore storage errors
      }
    }
  };

  const handleReducedMotionChange = (enabled: boolean) => {
    setReducedMotion(enabled);
    if (typeof window !== "undefined") {
      if (enabled) {
        document.documentElement.classList.add("reduced-motion");
      } else {
        document.documentElement.classList.remove("reduced-motion");
      }
      try {
        localStorage.setItem(LOCAL_STORAGE_MOTION_KEY, String(enabled));
      } catch {
        // ignore storage errors
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Persist to server (file/backend)
      await saveInterfacePreferencesAction({
        theme,
        density,
        reducedMotion,
      });

      // 2. Persist to client localStorage for immediate DOM styling across reloads
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
        localStorage.setItem(LOCAL_STORAGE_DENSITY_KEY, density);
        localStorage.setItem(LOCAL_STORAGE_MOTION_KEY, String(reducedMotion));
        document.documentElement.setAttribute("data-density", density);

        if (reducedMotion) {
          document.documentElement.classList.add("reduced-motion");
        } else {
          document.documentElement.classList.remove("reduced-motion");
        }
      }

      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2500);
    } catch {
      // Non-fatal fallback
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <Card className="p-6 border-border bg-card space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-emerald-400" />
          <h3 className="font-mono text-sm font-bold text-foreground">
            Interface Preferences
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Customize the look and feel, density, and animation behavior of the application.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Theme */}
        <div className="space-y-1.5">
          <label className="font-mono text-xs text-muted-foreground">Theme</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeOption)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="dark">Dark Technical (Workstation Default)</option>
            <option value="system">System Preference (Dark)</option>
            <option value="light" disabled>Light Theme (Disabled — Workstation Dark Only)</option>
          </select>
          <span className="text-[11px] text-muted-foreground">
            Strictly enforces a dark cybersecurity workstation aesthetic (Rule 8 &amp; docs/frontend.md) to reduce eye strain and preserve terminal contrast during CTF analysis.
          </span>
        </div>

        {/* Density */}
        <div className="space-y-1.5">
          <label className="font-mono text-xs text-muted-foreground">
            Display Density
          </label>
          <select
            value={density}
            onChange={(e) => handleDensityChange(e.target.value as DensityOption)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="comfortable">Comfortable (Standard spacing & padding)</option>
            <option value="compact">Compact (Tighter layout, optimized for laptops)</option>
          </select>
        </div>

        {/* Reduced Motion Toggle */}
        <div className="pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => handleReducedMotionChange(e.target.checked)}
              className="h-4 w-4 rounded border-border bg-background text-emerald-500 focus:ring-emerald-400"
            />
            <div className="space-y-0.5">
              <span className="font-mono text-xs font-semibold text-foreground">
                Enable Reduced Motion
              </span>
              <p className="text-[11px] text-muted-foreground">
                Disables sliding animations and transitions for improved accessibility.
              </p>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1.5">
            {savedFeedback && (
              <span className="flex items-center gap-1 font-mono text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Preferences saved!
              </span>
            )}
          </div>
          <Button type="submit" size="sm" disabled={isSaving} className="font-mono text-xs">
            {isSaving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
