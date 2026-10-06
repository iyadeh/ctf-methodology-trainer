"use client";

import type { AppSettings, GeminiModelInfo } from "@/modules/settings/types";
import { SettingsHeader } from "./settings-header";
import { AiConfigCard } from "./ai-config-card";
import { TrainingDefaultsCard } from "./training-defaults-card";
import { InterfacePreferencesCard } from "./interface-preferences-card";
import { DataStorageCard } from "./data-storage-card";

interface SettingsShellProps {
  readonly initialSettings: AppSettings;
  readonly initialModels?: GeminiModelInfo[];
  readonly formattedDate?: string;
}

export function SettingsShell({
  initialSettings,
  initialModels,
  formattedDate,
}: SettingsShellProps) {
  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* 1. Header */}
      <SettingsHeader formattedDate={formattedDate} />

      {/* 2. Main 2x2 Grid Layout */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Left Column */}
          <div className="space-y-6">
            <AiConfigCard
              initialAi={initialSettings.ai}
              initialModels={initialModels}
            />
            <TrainingDefaultsCard
              initialDefaults={initialSettings.trainingDefaults}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <InterfacePreferencesCard
              initialInterface={initialSettings.interface}
            />
            <DataStorageCard initialStorage={initialSettings.storage} />
          </div>
        </div>
      </div>
    </div>
  );
}
