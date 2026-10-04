"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MethodologyReferenceData } from "@/modules/methodology/reference";
import { MethodologyHeader } from "./methodology-header";
import { PhaseNavigator } from "./phase-navigator";
import { PhaseDetail } from "./phase-detail";

interface MethodologyShellProps {
  readonly data: MethodologyReferenceData;
  readonly initialPhase?: string;
}

export function MethodologyShell({
  data,
  initialPhase,
}: MethodologyShellProps) {
  const router = useRouter();

  const defaultPhaseKey = useMemo(() => {
    if (initialPhase && data.phases.some((p) => p.semanticKey.toLowerCase() === initialPhase.toLowerCase())) {
      return initialPhase.toLowerCase();
    }
    return data.phases[0]?.semanticKey ?? "reconnaissance";
  }, [initialPhase, data.phases]);

  const [selectedPhaseKey, setSelectedPhaseKey] = useState(defaultPhaseKey);

  const currentPhase = useMemo(() => {
    return (
      data.phases.find(
        (p) => p.semanticKey.toLowerCase() === selectedPhaseKey.toLowerCase(),
      ) || data.phases[0]
    );
  }, [data.phases, selectedPhaseKey]);

  const handleSelectPhase = (phaseKey: string) => {
    setSelectedPhaseKey(phaseKey);
    router.replace(`/methodology?phase=${encodeURIComponent(phaseKey)}`, {
      scroll: false,
    });
  };

  const totalChecks = useMemo(() => {
    return data.phases.reduce((acc, p) => acc + p.checks.length, 0);
  }, [data.phases]);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] min-h-0 bg-background overflow-hidden">
      {/* 1. Header */}
      <MethodologyHeader
        frameworkName={data.frameworkName}
        description={data.description}
        totalPhases={data.phases.length}
        totalChecks={totalChecks}
      />

      {/* 2. Main 2-Column Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Phase Navigator */}
        <div className="w-80 md:w-96 shrink-0 h-full">
          <PhaseNavigator
            phases={data.phases}
            selectedPhaseKey={currentPhase.semanticKey}
            onSelectPhase={handleSelectPhase}
          />
        </div>

        {/* Right: Phase Detail Panel */}
        <div className="flex-1 h-full min-w-0 bg-background/50">
          <PhaseDetail
            phase={currentPhase}
            allPhases={data.phases}
            onSelectPhase={handleSelectPhase}
          />
        </div>
      </div>
    </div>
  );
}
