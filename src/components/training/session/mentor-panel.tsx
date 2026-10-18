"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  BookOpen,
  Compass,
  CornerDownRight,
  HelpCircle,
  Lightbulb,
  Loader2,
  RefreshCw,
  Send,
  Shield,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  askMentorAction,
  generateAiChecklistAction,
} from "@/modules/mentor/actions";
import type { HintMetrics, HintRecord, MentorGuidanceResult } from "@/modules/mentor/types";
import {
  SPOILER_LEVEL_NAMES,
  type GuidanceMode,
  type SpoilerLevel,
} from "@/modules/guidance/types";
import { calculateSpoilerPenalty } from "@/modules/guidance/engine";
import type { AttemptRecord, FindingRecord, MethodologyDeviationRecord } from "@/modules/training/types";
import { phaseMetadataMap } from "@/modules/methodology/reference";

interface MentorPanelProps {
  readonly sessionId: string;
  readonly currentPhaseName: string;
  readonly currentPhaseKey: string;
  readonly activeCheckTitle?: string;
  readonly activeFocusTitle?: string;
  readonly initialHints?: readonly HintRecord[];
  readonly initialMetrics?: HintMetrics;
  readonly findings?: readonly FindingRecord[];
  readonly deviations?: readonly MethodologyDeviationRecord[];
  readonly attempts?: readonly AttemptRecord[];
  readonly prefilledQuery?: string | null;
}

function getDynamicPresetQuestions(
  phaseKey: string,
  confirmedServices: string[],
  hasDeviations: boolean,
  hasFailedAttempts: boolean,
): string[] {
  const questions: string[] = [];

  // Phase-specific questions
  if (phaseKey === "reconnaissance") {
    questions.push("What is the most effective scanning sequence for this phase?");
    questions.push("How should I verify service versions before proceeding?");
  } else if (phaseKey === "threat-modeling") {
    questions.push("How do I identify trust boundaries across my confirmed services?");
    questions.push("Which confirmed open service represents the highest-priority attack surface?");
  } else if (phaseKey === "vulnerability-analysis") {
    questions.push("How do I search for public CVEs matching my confirmed service versions?");
    questions.push("How should I formulate a testable hypothesis before running exploit tools?");
  } else if (phaseKey === "exploitation") {
    questions.push("What prerequisites must be verified before executing this attack payload?");
    questions.push("How do I stabilize an interactive reverse shell connection?");
  } else if (phaseKey === "post-exploitation") {
    questions.push("What local enumeration commands should I run first upon gaining a shell?");
    questions.push("How do I check sudo privileges and SUID binaries for privilege escalation?");
  }

  // Service-specific questions
  if (confirmedServices.some((s) => s.includes("http"))) {
    questions.push("What wordlists and flags are recommended for HTTP directory fuzzing?");
  }
  if (confirmedServices.some((s) => s.includes("ssh"))) {
    questions.push("How do I audit supported SSH authentication methods without locking accounts?");
  }
  if (confirmedServices.some((s) => s.includes("smb"))) {
    questions.push("How do I enumerate SMB shares and null sessions safely?");
  }

  // Situation-specific questions
  if (hasFailedAttempts) {
    questions.push("My exploit attempt failed. How can I verify if the vulnerability actually exists?");
  }
  if (hasDeviations) {
    questions.push("I bypassed a phase gate earlier. What required checks should I revisit?");
  }

  return questions.slice(0, 5);
}

export function MentorPanel({
  sessionId,
  currentPhaseName,
  currentPhaseKey,
  activeCheckTitle,
  activeFocusTitle,
  initialHints = [],
  initialMetrics = {
    totalHints: 0,
    methodologyHints: 0,
    conceptExplanations: 0,
    machineSpecificHints: 0,
    fullReveals: 0,
    totalPenaltyPoints: 0,
  },
  findings = [],
  deviations = [],
  attempts = [],
  prefilledQuery,
}: MentorPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [spoilerLevel, setSpoilerLevel] = useState<SpoilerLevel>(0);
  const [mode, setMode] = useState<GuidanceMode>("methodology_hint");
  const [userQuery, setUserQuery] = useState(prefilledQuery ?? "");
  const [latestGuidance, setLatestGuidance] = useState<MentorGuidanceResult | null>(null);
  const [hints, setHints] = useState<HintRecord[]>([...initialHints]);
  const [metrics, setMetrics] = useState<HintMetrics>(initialMetrics);
  const [error, setError] = useState<string | null>(null);
  const [checklistNotice, setChecklistNotice] = useState<string | null>(null);

  const [prevPrefilledQuery, setPrevPrefilledQuery] = useState(prefilledQuery);
  if (prefilledQuery && prefilledQuery !== prevPrefilledQuery) {
    setPrevPrefilledQuery(prefilledQuery);
    setUserQuery(prefilledQuery);
  }

  const confirmedServices = findings
    .filter((f) => f.evidenceState === "confirmed" && f.contextKind === "service" && Boolean(f.contextValue))
    .map((f) => f.contextValue!.toLowerCase());

  const hasDeviations = deviations.length > 0;
  const failedAttemptsCount = attempts.filter(
    (a) => a.outcome === "rejected" || a.outcome === "inconclusive",
  ).length;
  const hasFailedAttempts = failedAttemptsCount >= 2;

  const dynamicPresetQuestions = getDynamicPresetQuestions(
    currentPhaseKey,
    confirmedServices,
    hasDeviations,
    hasFailedAttempts,
  );

  const phaseMeta = phaseMetadataMap[currentPhaseKey];

  // Escalation Confirmation Modal state
  const [escalationTarget, setEscalationTarget] = useState<SpoilerLevel | null>(null);

  const handleLevelSelect = (target: SpoilerLevel) => {
    // If target is machine-specific (Level >= 4) and higher than current, require explicit confirmation
    if (target >= 4 && target > spoilerLevel) {
      setEscalationTarget(target);
    } else {
      setSpoilerLevel(target);
    }
  };

  const confirmEscalation = () => {
    if (escalationTarget !== null) {
      setSpoilerLevel(escalationTarget);
      setEscalationTarget(null);
    }
  };

  const cancelEscalation = () => {
    setEscalationTarget(null);
  };

  const handleAskMentor = (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryToSend = customQuery ?? userQuery;
    setError(null);
    setChecklistNotice(null);

    startTransition(async () => {
      const res = await askMentorAction({
        sessionId,
        mode,
        spoilerLevel,
        userQuery: queryToSend.trim() || undefined,
        currentCheckKey: activeCheckTitle,
      });

      if (!res.ok || !res.data) {
        setError(res.error || "Failed to obtain guidance from AI Mentor.");
      } else {
        setLatestGuidance(res.data);
        setHints((prev) => [res.data!.record, ...prev]);
        setMetrics((prev) => ({
          ...prev,
          totalHints: prev.totalHints + 1,
          totalPenaltyPoints: prev.totalPenaltyPoints + res.data!.penaltyPoints,
          methodologyHints:
            spoilerLevel <= 3 && mode !== "concept_explanation"
              ? prev.methodologyHints + 1
              : prev.methodologyHints,
          conceptExplanations:
            mode === "concept_explanation"
              ? prev.conceptExplanations + 1
              : prev.conceptExplanations,
          machineSpecificHints:
            spoilerLevel === 4 || spoilerLevel === 5
              ? prev.machineSpecificHints + 1
              : prev.machineSpecificHints,
          fullReveals: spoilerLevel === 6 ? prev.fullReveals + 1 : prev.fullReveals,
        }));
        setUserQuery("");
      }
    });
  };

  const handleGenerateChecklist = () => {
    setError(null);
    setChecklistNotice(null);

    startTransition(async () => {
      const res = await generateAiChecklistAction(sessionId);
      if (!res.ok) {
        setError(res.error || "Failed to generate AI checklist extensions.");
      } else if (res.addedCount === 0) {
        setChecklistNotice("No additional contextual checks were needed for this phase.");
      } else {
        setChecklistNotice(`Added ${res.addedCount} suggested exploratory check(s) to your checklist.`);
      }
    });
  };

  const currentPenalty = calculateSpoilerPenalty(spoilerLevel);

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Mentor Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">AI Mentor & Guidance</h2>
            <Badge variant="outline" className="border-primary/40 text-primary font-mono text-[10px]">
              Spoiler Level {spoilerLevel}: {SPOILER_LEVEL_NAMES[spoilerLevel].toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Methodology-first learning assistant. Gives minimal necessary clues to preserve your discovery experience.
          </p>
        </div>

        {/* Evaluation Metrics Preview */}
        <div className="flex items-center gap-4 bg-card/60 border border-border rounded-lg p-2.5 px-4 font-mono text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground block">CURRENT PHASE</span>
            <span className="font-semibold text-foreground">{currentPhaseName}</span>
            <span className="text-[10px] text-muted-foreground font-mono block">({currentPhaseKey})</span>
          </div>
          <div className="h-6 w-px bg-border" />
          <div>
            <span className="text-[10px] text-muted-foreground block">HINTS USED</span>
            <span className="font-semibold text-foreground">{metrics.totalHints}</span>
          </div>
          <div className="h-6 w-px bg-border" />
          <div>
            <span className="text-[10px] text-muted-foreground block">MACHINE HINTS</span>
            <span className={cn("font-semibold", metrics.machineSpecificHints > 0 ? "text-amber-400" : "text-foreground")}>
              {metrics.machineSpecificHints}
            </span>
          </div>
          <div className="h-6 w-px bg-border" />
          <div>
            <span className="text-[10px] text-muted-foreground block">SCORE PENALTY</span>
            <span className={cn("font-semibold", metrics.totalPenaltyPoints > 0 ? "text-rose-400" : "text-emerald-400")}>
              -{metrics.totalPenaltyPoints} pts
            </span>
          </div>
        </div>
      </div>

      {/* Escalation Warning Modal / Alert */}
      {escalationTarget !== null && (
        <div className="border border-amber-500/40 bg-amber-950/20 rounded-lg p-4 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-300">
                Confirm Spoiler Level Escalation to Level {escalationTarget} ({SPOILER_LEVEL_NAMES[escalationTarget].toUpperCase()})
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {escalationTarget === 6 ? (
                  <span className="text-rose-300 font-medium">
                    FULL REVEAL WARNING: This level reveals the direct reference solution and credentials.
                    A heavy evaluation penalty of -25 points will be deducted from your final session score.
                  </span>
                ) : (
                  <span>
                    You are requesting machine-specific context. While raw credentials remain protected,
                    using this level incurs a penalty of -{calculateSpoilerPenalty(escalationTarget)} points on your methodology review.
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end pt-1">
            <Button variant="outline" size="sm" onClick={cancelEscalation} className="text-xs h-8">
              Cancel (Stay at Level {spoilerLevel})
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={confirmEscalation}
              className="bg-amber-600 hover:bg-amber-700 text-foreground text-xs h-8"
            >
              Confirm Escalation (-{calculateSpoilerPenalty(escalationTarget)} pts)
            </Button>
          </div>
        </div>
      )}

      {/* Error or Notice Alert */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="border border-destructive/40 bg-destructive/10 rounded-lg p-3 text-xs text-destructive flex items-center justify-between"
        >
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => handleAskMentor()} className="h-7 text-[11px]">
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </div>
      )}

      {checklistNotice && (
        <div
          role="status"
          aria-live="polite"
          className="border border-primary/40 bg-primary/10 rounded-lg p-3 text-xs text-primary flex items-center gap-2"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{checklistNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Controls, Question input, and Modes */}
        <div className="lg:col-span-1 space-y-5">
          {/* Spoiler Level Selector Card */}
          <Card className="border-border bg-card/60">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Spoiler Boundary</span>
                <span className="text-[10px] text-primary lowercase">
                  current: -{currentPenalty} pts
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-1.5">
              {([0, 1, 2, 3, 4, 5, 6] as SpoilerLevel[]).map((lvl) => {
                const penalty = calculateSpoilerPenalty(lvl);
                const isCurrent = spoilerLevel === lvl;
                const isHighPenalty = lvl >= 5;

                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleLevelSelect(lvl)}
                    className={cn(
                      "w-full text-left p-2 rounded text-xs flex items-center justify-between transition-colors border",
                      isCurrent
                        ? "bg-primary/15 border-primary/60 text-foreground font-medium"
                        : "border-transparent text-muted-foreground hover:bg-card hover:text-foreground",
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={cn("font-mono text-[11px]", isCurrent ? "text-primary font-bold" : "text-muted-foreground")}>
                        L{lvl}
                      </span>
                      <span className="truncate">{SPOILER_LEVEL_NAMES[lvl]}</span>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-mono",
                        penalty === 0
                          ? "text-emerald-400"
                          : isHighPenalty
                          ? "text-rose-400 font-semibold"
                          : "text-amber-400",
                      )}
                    >
                      {penalty === 0 ? "0 pts" : `-${penalty} pts`}
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Guidance Mode Selector Card */}
          <Card className="border-border bg-card/60">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Guidance Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 grid grid-cols-1 gap-1.5">
              {[
                { id: "methodology_hint", label: "Methodology Clue", icon: Lightbulb, desc: "Step-by-step methodology guidance" },
                { id: "concept_explanation", label: "Explain Concept", icon: BookOpen, desc: "Theoretical understanding of concepts" },
                { id: "next_step_guidance", label: "Next Step Guidance", icon: Compass, desc: "Prioritized tasks in current phase" },
              ].map((m) => {
                const Icon = m.icon;
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id as GuidanceMode)}
                    className={cn(
                      "text-left p-2.5 rounded text-xs border transition-colors flex items-start gap-2.5",
                      active
                        ? "bg-card border-primary/50 text-foreground"
                        : "border-transparent text-muted-foreground hover:bg-card/40 hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <div className={cn("font-medium", active && "text-primary")}>{m.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Contextual Playbook Extensions Action */}
          <Card className="border-border bg-card/40">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>AI Checklist Suggestions</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Analyze confirmed evidence in {currentPhaseName} and suggest relevant exploratory checks.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateChecklist}
                disabled={isPending}
                className="w-full text-xs h-8 border-border hover:border-primary/50"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
                )}
                Suggest Exploratory Checks
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Interaction, Current Guidance & History */}
        <div className="lg:col-span-2 space-y-5">
          {/* Proactive Methodology Strategy & Guardrails Card */}
          <Card className="border-border bg-card/60">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-primary" />
                  <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Phase Strategy & Guardrails
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                  {currentPhaseName}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              {phaseMeta && (
                <div className="space-y-1 text-xs text-muted-foreground leading-relaxed">
                  <p className="text-foreground/90 font-medium">{phaseMeta.tagLine}</p>
                  <p className="text-[11px] text-muted-foreground">
                    <strong className="text-foreground font-semibold">Mindset: </strong>{phaseMeta.mindset}
                  </p>
                </div>
              )}

              {/* Methodology Deviation Alert */}
              {hasDeviations && (
                <div className="border border-amber-500/30 bg-amber-950/20 rounded p-2.5 flex items-start gap-2.5 text-xs">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-300">Phase Gate Deviation Active:</span>
                    <span className="text-amber-200/80 ml-1">
                      {deviations.length} gate override(s) recorded. Skipping required checks reduces your recon coverage. Revisit missing checks if you get stuck.
                    </span>
                  </div>
                </div>
              )}

              {/* Failed Attempts Alert */}
              {hasFailedAttempts && (
                <div className="border border-rose-500/30 bg-rose-950/20 rounded p-2.5 flex items-start gap-2.5 text-xs">
                  <Shield className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-rose-300">Invariant: HYPOTHESIS BEFORE ACTION:</span>
                    <span className="text-rose-200/80 ml-1">
                      {failedAttemptsCount} failed attempt(s) detected. Avoid trial-and-error exploit payload spam. Formulate a specific hypothesis linked to confirmed evidence before trying again.
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border/40">
                <span className="text-[11px] text-muted-foreground">
                  Need a structured methodology roadmap and prioritized checks for this phase?
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    setMode("next_step_guidance");
                    const roadmapQuery = `What is the recommended methodology roadmap and priority checks for ${currentPhaseName}?`;
                    setUserQuery(roadmapQuery);
                    handleAskMentor(undefined, roadmapQuery);
                  }}
                  className="h-7 text-xs border-primary/40 hover:bg-primary/10 text-primary shrink-0"
                >
                  <Compass className="h-3 w-3 mr-1" />
                  Ask for Phase Roadmap
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ask Question / Trigger Hint Card */}
          <Card className="border-border bg-card/60">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="h-3.5 w-3.5 text-primary" />
                <span>Consult Mentor</span>
              </CardTitle>
              {(activeFocusTitle || activeCheckTitle) && (
                <span className="text-[11px] text-muted-foreground truncate max-w-[320px]">
                  Focus: <span className="text-foreground">{activeFocusTitle || activeCheckTitle}</span>
                </span>
              )}
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
              <form onSubmit={(e) => handleAskMentor(e)} className="space-y-3">
                {activeFocusTitle && (
                  <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded px-2.5 py-1.5 text-xs text-primary">
                    <div className="flex items-center gap-1.5 truncate">
                      <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Context: {activeFocusTitle}</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-mono border-primary/40 text-primary shrink-0">
                      Hypothesis Linked
                    </Badge>
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder={`Ask a question or request ${SPOILER_LEVEL_NAMES[spoilerLevel]} guidance...`}
                    className="w-full bg-background/80 border border-border rounded-md px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary pr-20"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending}
                    className="absolute right-1.5 top-1.5 h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-3 w-3 mr-1" /> Ask
                      </>
                    )}
                  </Button>
                </div>

                {/* Quick Prompts */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                    Contextual Prompts:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {dynamicPresetQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setUserQuery(q);
                          handleAskMentor(undefined, q);
                        }}
                        className="text-[11px] bg-background/50 hover:bg-background border border-border hover:border-primary/40 rounded px-2.5 py-1 text-muted-foreground hover:text-foreground text-left transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Active Guidance Response Box */}
          {latestGuidance && (
            <Card className="border border-primary/40 bg-card shadow-sm animate-in fade-in duration-200">
              <CardHeader className="p-4 pb-2 border-b border-border/50 flex flex-row items-center justify-between bg-primary/5">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <CardTitle className="text-xs font-semibold text-foreground">
                    Mentor Guidance (Level {latestGuidance.spoilerLevel}: {latestGuidance.spoilerLevelName.toUpperCase()})
                  </CardTitle>
                </div>
                {latestGuidance.isFallback && (
                  <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">
                    Offline / Deterministic
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Main Content */}
                <FormattedMarkdown content={latestGuidance.content} />

                {/* Concept Explanation Callout */}
                {latestGuidance.conceptExplanation && (
                  <div className="bg-background/80 border border-border/80 rounded p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Security Concept</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {latestGuidance.conceptExplanation}
                    </p>
                  </div>
                )}

                {/* Recommended Technique & Tools */}
                {(latestGuidance.recommendedTechnique || latestGuidance.suggestedTools?.length) && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/40 text-xs">
                    {latestGuidance.recommendedTechnique && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Wrench className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Technique: <strong className="text-foreground">{latestGuidance.recommendedTechnique}</strong></span>
                      </div>
                    )}

                    {latestGuidance.suggestedTools && latestGuidance.suggestedTools.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Terminal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {latestGuidance.suggestedTools.map((t, i) => (
                            <span key={i} className="font-mono text-[10px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Hint History Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <CornerDownRight className="h-3.5 w-3.5 text-primary" />
              <span>Hint History ({hints.length})</span>
            </h3>

            {hints.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                No hints requested yet in this session. Start by selecting a guidance mode above.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {hints.map((hint) => (
                  <div
                    key={hint.id}
                    className="p-3 rounded-lg border border-border/70 bg-card/40 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          L{hint.spoilerLevel} {hint.spoilerLevelName}
                        </Badge>
                        <span className="text-muted-foreground font-mono text-[10px]">
                          Phase: {hint.phaseKey}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(hint.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {hint.userQuery && (
                      <div className="text-[11px] text-muted-foreground italic">
                        &quot;{hint.userQuery}&quot;
                      </div>
                    )}

                    <FormattedMarkdown content={hint.content} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormattedMarkdown({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");

  return (
    <div className="space-y-1.5 text-xs text-foreground/90 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Heading 3 or 4: ### or ####
        if (trimmed.startsWith("### ") || trimmed.startsWith("#### ")) {
          const text = trimmed.replace(/^#{3,4}\s+/, "");
          return (
            <h4
              key={idx}
              className="text-xs font-semibold text-primary pt-1.5 pb-0.5 border-b border-border/40"
            >
              {text}
            </h4>
          );
        }

        // Bullet point: • or - or *
        const isBullet =
          trimmed.startsWith("• ") ||
          trimmed.startsWith("- ") ||
          trimmed.startsWith("* ");

        const bulletText = isBullet ? trimmed.replace(/^[•\-*]\s+/, "") : trimmed;
        const renderedText = renderInlineMarkdown(bulletText);

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-primary font-bold shrink-0 mt-0.5">•</span>
              <span className="flex-1">{renderedText}</span>
            </div>
          );
        }

        return <p key={idx}>{renderedText}</p>;
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="font-mono text-[11px] bg-background border border-border/80 px-1 py-0.5 rounded text-primary"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
