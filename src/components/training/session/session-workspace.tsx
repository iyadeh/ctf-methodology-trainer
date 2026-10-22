"use client";

import { useState } from "react";
import { CheckSquare, Compass, FileText, Lightbulb, LockOpen, Search, Sparkles, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrainingSessionAggregate } from "@/modules/training/types";
import type { HintMetrics, HintRecord } from "@/modules/mentor/types";
import type { RevealedReferencePath } from "@/modules/training/completion";
import type { HypothesisInitialTarget } from "./hypotheses-panel";
import { SessionHeader } from "./session-header";
import { PhaseStepper } from "./phase-stepper";
import { ChecklistSection } from "./checklist-section";
import { FindingsPanel } from "./findings-panel";
import { HypothesesPanel } from "./hypotheses-panel";
import { NotesPanel } from "./notes-panel";
import { ContextPanel } from "./context-panel";
import { MentorPanel } from "./mentor-panel";
import { ReferencePathPanel } from "./reference-path-panel";
import { GuidedTasksPanel } from "./guided-tasks-panel";
import { AdventureModePanel } from "./adventure-mode-panel";

interface SessionWorkspaceProps {
  readonly aggregate: TrainingSessionAggregate;
  readonly initialHints?: readonly HintRecord[];
  readonly initialMetrics?: HintMetrics;
  readonly revealedReferencePath?: RevealedReferencePath | null;
}

type TabType =
  | "tasks"
  | "checklist"
  | "findings"
  | "hypotheses"
  | "notes"
  | "context"
  | "mentor"
  | "reference-path";

export function SessionWorkspace({
  aggregate,
  initialHints = [],
  initialMetrics,
  revealedReferencePath,
}: SessionWorkspaceProps) {
  const isCompleted = aggregate.session.status === "completed";
  const isGuidedMode = aggregate.session.mode === "guided";
  const milestones = aggregate.milestones ?? [];
  const remainingTasks = milestones.filter((m) => m.status !== "completed").length;
  const currentActiveMilestone =
    milestones.find((m) => m.status === "unlocked") ??
    milestones.find((m) => m.status === "locked");

  const [activeTab, setActiveTab] = useState<TabType>(
    isCompleted && revealedReferencePath?.available
      ? "reference-path"
      : isGuidedMode
        ? "tasks"
        : "checklist",
  );
  const [selectedPhaseKey, setSelectedPhaseKey] = useState<string | null>(null);
  const [mentorPrefilledQuery, setMentorPrefilledQuery] = useState<string | null>(null);
  const [mentorFocusTitle, setMentorFocusTitle] = useState<string | null>(null);
  const [hypothesisInitialTarget, setHypothesisInitialTarget] = useState<HypothesisInitialTarget | null>(null);

  // Derive effective tab: fallback to checklist if mode is adventure and tasks was selected
  const currentTab: TabType = !isGuidedMode && activeTab === "tasks" ? "checklist" : activeTab;

  const handleConsultMentor = (query: string, focusTitle?: string) => {
    setMentorPrefilledQuery(query);
    setMentorFocusTitle(focusTitle ?? null);
    setActiveTab("mentor");
  };

  const handleFormulateHypothesis = (findingId: string, findingTitle?: string) => {
    setHypothesisInitialTarget({
      findingId,
      findingTitle,
      timestamp: Date.now(),
    });
    setActiveTab("hypotheses");
  };

  const { session, phases, currentPhase, findings, hypotheses, attempts, notes, context } =
    aggregate;

  const viewedPhase = phases.find((p) => p.semanticKey === selectedPhaseKey) ?? currentPhase ?? phases[0];

  const currentPhaseIndex = currentPhase
    ? phases.findIndex((p) => p.semanticKey === currentPhase.semanticKey)
    : -1;
  const isFinalPhase = currentPhaseIndex === phases.length - 1;

  const tabs: { id: TabType; label: string; count?: number; icon: React.ComponentType<{ className?: string }> }[] = [
    ...(isGuidedMode
      ? [
          {
            id: "tasks" as TabType,
            label: "Guided Tasks",
            count: remainingTasks > 0 ? remainingTasks : undefined,
            icon: Sparkles,
          },
        ]
      : []),
    { id: "checklist", label: "Checklist", icon: CheckSquare },
    { id: "findings", label: "Findings", count: findings.length, icon: Search },
    { id: "hypotheses", label: "Hypotheses", count: hypotheses.length, icon: Lightbulb },
    { id: "notes", label: "Notes", count: notes.length, icon: FileText },
    { id: "context", label: "Context", count: context.length, icon: Tag },
    { id: "mentor", label: "AI Mentor", count: initialHints.length > 0 ? initialHints.length : undefined, icon: Compass },
    ...(isCompleted
      ? [
          {
            id: "reference-path" as TabType,
            label: "Reference Path",
            count: revealedReferencePath?.referencePathNodes?.length,
            icon: LockOpen,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Session Header */}
      <SessionHeader aggregate={aggregate} />

      {/* PTES 6-Phase Stepper */}
      <PhaseStepper
        phases={phases}
        currentPhaseKey={currentPhase?.semanticKey ?? null}
        viewedPhaseKey={viewedPhase?.semanticKey ?? null}
        onSelectPhase={(phaseKey) => {
          setSelectedPhaseKey(phaseKey);
          if (currentTab !== "tasks") {
            setActiveTab("checklist");
          }
        }}
      />

      {/* Adventure Mode Banner & Direct Flags */}
      {session.mode === "adventure" && (
        <AdventureModePanel
          sessionId={session.id}
          targetIp={session.targetIp}
          userFlagSubmitted={session.userFlag}
          userFlagSubmittedAt={session.userFlagSubmittedAt}
          rootFlagSubmitted={session.rootFlag}
          rootFlagSubmittedAt={session.rootFlagSubmittedAt}
          isCompleted={isCompleted}
        />
      )}

      {/* Guided Mode: Active Task Spotlight Bar when viewing other tabs */}
      {isGuidedMode && currentTab !== "tasks" && currentActiveMilestone && (
        <div className="border-b border-border bg-primary/5 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-primary shrink-0">
              Current Task {currentActiveMilestone.sortOrder}:
            </span>
            <span className="text-foreground truncate">
              {currentActiveMilestone.title} — {currentActiveMilestone.question}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className="text-primary hover:underline font-semibold ml-4 shrink-0 flex items-center gap-1"
          >
            <span>Open Task</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="border-b border-border bg-card/40 px-4 sm:px-6">
        <nav className="flex space-x-1 sm:space-x-4" aria-label="Session sections">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id !== "hypotheses") {
                    setHypothesisInitialTarget(null);
                  }
                  setActiveTab(tab.id);
                }}
                className={cn(
                  "flex items-center gap-2 border-b-2 py-3 px-3 text-xs font-medium transition-colors",
                  isActive
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 font-mono text-[10px]",
                      isActive ? "bg-primary/20 text-primary font-semibold" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <main className="flex-1 bg-background/50">
        {currentTab === "tasks" && (
          <GuidedTasksPanel
            sessionId={session.id}
            milestones={milestones}
            currentPhaseKey={currentPhase?.semanticKey}
            viewedPhaseKey={viewedPhase?.semanticKey}
            isCompleted={isCompleted}
            onConsultMentor={handleConsultMentor}
          />
        )}
        {currentTab === "checklist" && (
          <ChecklistSection
            sessionId={session.id}
            currentPhase={currentPhase}
            viewedPhase={viewedPhase}
            isFinalPhase={isFinalPhase}
            isCompleted={isCompleted}
            onReturnToActivePhase={() => {
              setSelectedPhaseKey(null);
            }}
          />
        )}
        {currentTab === "findings" && (
          <FindingsPanel
            sessionId={session.id}
            findings={findings}
            isCompleted={isCompleted}
            onFormulateHypothesis={handleFormulateHypothesis}
          />
        )}
        {currentTab === "hypotheses" && (
          <HypothesesPanel
            sessionId={session.id}
            hypotheses={hypotheses}
            attempts={attempts}
            findings={findings}
            isCompleted={isCompleted}
            onConsultMentor={handleConsultMentor}
            initialTarget={hypothesisInitialTarget}
          />
        )}
        {currentTab === "notes" && (
          <NotesPanel
            sessionId={session.id}
            notes={notes}
            isCompleted={isCompleted}
          />
        )}
        {currentTab === "context" && <ContextPanel context={context} />}
        {currentTab === "mentor" && (
          <MentorPanel
            sessionId={session.id}
            currentPhaseName={currentPhase?.name || "Reconnaissance"}
            currentPhaseKey={currentPhase?.semanticKey || "reconnaissance"}
            activeCheckTitle={currentPhase?.checks.find((c) => c.status === "active")?.title}
            activeFocusTitle={mentorFocusTitle ?? undefined}
            initialHints={initialHints}
            initialMetrics={initialMetrics}
            findings={findings}
            deviations={aggregate.deviations}
            attempts={attempts}
            prefilledQuery={mentorPrefilledQuery}
          />
        )}
        {currentTab === "reference-path" && (
          <ReferencePathPanel referencePath={revealedReferencePath ?? null} />
        )}
      </main>
    </div>
  );
}
