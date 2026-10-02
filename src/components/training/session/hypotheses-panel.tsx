"use client";

import { useState, useTransition } from "react";
import { Lightbulb, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttemptRecord, FindingRecord, HypothesisRecord } from "@/modules/training/types";
import { attemptOutcomeEnum } from "@/lib/db/schema";
import {
  createAttemptAction,
  createHypothesisAction,
} from "@/app/training/[sessionId]/actions";

type AttemptOutcome = (typeof attemptOutcomeEnum.enumValues)[number];

interface HypothesesPanelProps {
  readonly sessionId: string;
  readonly hypotheses: readonly HypothesisRecord[];
  readonly attempts: readonly AttemptRecord[];
  readonly findings: readonly FindingRecord[];
}

export function HypothesesPanel({
  sessionId,
  hypotheses,
  attempts,
  findings,
}: HypothesesPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [showAddHypothesis, setShowAddHypothesis] = useState(false);
  const [activeAttemptHypothesisId, setActiveAttemptHypothesisId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Hypothesis form
  const [basedOnFindingId, setBasedOnFindingId] = useState<string>("");
  const [hypothesisText, setHypothesisText] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [testApproach, setTestApproach] = useState("");

  // Attempt form
  const [attemptAction, setAttemptAction] = useState("");
  const [attemptNotes, setAttemptNotes] = useState("");
  const [attemptResult, setAttemptResult] = useState("");
  const [attemptOutcome, setAttemptOutcome] = useState<AttemptOutcome>("inconclusive");

  const handleHypothesisSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await createHypothesisAction(sessionId, {
        basedOnFindingId: basedOnFindingId || null,
        hypothesis: hypothesisText.trim(),
        reasoning: reasoning.trim(),
        expectedResult: expectedResult.trim(),
        testApproach: testApproach.trim(),
        outcome: "open",
      });

      if (!res.ok) {
        setError(res.error);
      } else {
        setHypothesisText("");
        setReasoning("");
        setExpectedResult("");
        setTestApproach("");
        setShowAddHypothesis(false);
      }
    });
  };

  const handleAttemptSubmit = (hypothesisId: string) => {
    setError(null);

    startTransition(async () => {
      const res = await createAttemptAction(sessionId, {
        hypothesisId,
        action: attemptAction.trim(),
        notes: attemptNotes.trim() || null,
        result: attemptResult.trim() || null,
        outcome: attemptOutcome,
      });

      if (!res.ok) {
        setError(res.error);
      } else {
        setAttemptAction("");
        setAttemptNotes("");
        setAttemptResult("");
        setActiveAttemptHypothesisId(null);
      }
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Hypothesis-Driven Exploitation ({hypotheses.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Hypotheses prevent random trial-and-error by linking observable evidence to planned verification attempts.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => setShowAddHypothesis(!showAddHypothesis)}
          className="gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          New Hypothesis
        </Button>
      </div>

      {showAddHypothesis && (
        <Card className="border-primary/40 bg-card">
          <CardHeader className="py-3.5 px-4 sm:px-5 border-b border-border/60">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-primary">
              Formulate Attack Hypothesis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <form onSubmit={handleHypothesisSubmit} className="space-y-4">
              {error && <p className="text-xs text-destructive">{error}</p>}

              {findings.length > 0 && (
                <div>
                  <label htmlFor="h-finding" className="block text-xs font-medium text-foreground">
                    Based on Finding (Optional)
                  </label>
                  <select
                    id="h-finding"
                    value={basedOnFindingId}
                    onChange={(e) => setBasedOnFindingId(e.target.value)}
                    className="mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">(None / General Hypothesis)</option>
                    {findings.map((f) => (
                      <option key={f.id} value={f.id}>
                        [{f.category}] {f.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="h-hyp" className="block text-xs font-medium text-foreground">
                  Hypothesis Statement *
                </label>
                <input
                  id="h-hyp"
                  type="text"
                  required
                  value={hypothesisText}
                  onChange={(e) => setHypothesisText(e.target.value)}
                  placeholder="e.g. Anonymous FTP upload allows creating a webshell if webroot is shared."
                  className="mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="h-reason" className="block text-xs font-medium text-foreground">
                    Reasoning *
                  </label>
                  <textarea
                    id="h-reason"
                    required
                    rows={2}
                    value={reasoning}
                    onChange={(e) => setReasoning(e.target.value)}
                    placeholder="Why is this plausible?"
                    className="mt-1 w-full rounded border border-border bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="h-expected" className="block text-xs font-medium text-foreground">
                    Expected Result *
                  </label>
                  <textarea
                    id="h-expected"
                    required
                    rows={2}
                    value={expectedResult}
                    onChange={(e) => setExpectedResult(e.target.value)}
                    placeholder="What observable output proves this?"
                    className="mt-1 w-full rounded border border-border bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="h-approach" className="block text-xs font-medium text-foreground">
                    Test Approach *
                  </label>
                  <textarea
                    id="h-approach"
                    required
                    rows={2}
                    value={testApproach}
                    onChange={(e) => setTestApproach(e.target.value)}
                    placeholder="Commands or payload to verify"
                    className="mt-1 w-full rounded border border-border bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddHypothesis(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="text-xs">
                  Save Hypothesis
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Hypotheses list */}
      {hypotheses.length === 0 ? (
        <Card className="border-dashed text-center">
          <CardContent className="py-12">
            <p className="text-sm text-muted-foreground">
              No hypotheses formulated yet. Formulate hypotheses before attempting active exploitation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {hypotheses.map((hypothesis) => {
            const linkedFinding = findings.find((f) => f.id === hypothesis.basedOnFindingId);
            const linkedAttempts = attempts.filter((a) => a.hypothesisId === hypothesis.id);
            const isRecordingAttempt = activeAttemptHypothesisId === hypothesis.id;

            return (
              <Card key={hypothesis.id} className="border-border/80 bg-card/60">
                <CardContent className="p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="text-sm font-semibold tracking-tight text-foreground">
                          {hypothesis.hypothesis}
                        </h3>
                        <Badge
                          variant={
                            hypothesis.outcome === "confirmed"
                              ? "default"
                              : hypothesis.outcome === "rejected"
                                ? "destructive"
                                : "outline"
                          }
                          className="font-mono text-[10px] capitalize"
                        >
                          {hypothesis.outcome}
                        </Badge>
                      </div>

                      {linkedFinding && (
                        <p className="text-xs text-muted-foreground">
                          Based on: <span className="font-semibold text-foreground">[{linkedFinding.category}] {linkedFinding.title}</span>
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setActiveAttemptHypothesisId(isRecordingAttempt ? null : hypothesis.id)
                      }
                      className="shrink-0 text-xs gap-1.5"
                    >
                      <Plus className="h-3 w-3" />
                      Record Attempt
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 rounded bg-background/50 p-3 sm:grid-cols-3 text-xs">
                    <div>
                      <span className="font-mono text-[10px] text-muted-foreground uppercase">Reasoning:</span>
                      <p className="text-foreground/90 mt-0.5">{hypothesis.reasoning}</p>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] text-muted-foreground uppercase">Expected:</span>
                      <p className="text-foreground/90 mt-0.5">{hypothesis.expectedResult}</p>
                    </div>
                    <div>
                      <span className="font-mono text-[10px] text-muted-foreground uppercase">Approach:</span>
                      <p className="text-foreground/90 mt-0.5">{hypothesis.testApproach}</p>
                    </div>
                  </div>

                  {/* Form to record attempt under this hypothesis */}
                  {isRecordingAttempt && (
                    <div className="rounded border border-primary/30 bg-card p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">
                        Record Verification Attempt
                      </h4>
                      <div>
                        <label htmlFor={`act-${hypothesis.id}`} className="block text-xs font-medium text-foreground">
                          Action / Command Run *
                        </label>
                        <input
                          id={`act-${hypothesis.id}`}
                          type="text"
                          required
                          value={attemptAction}
                          onChange={(e) => setAttemptAction(e.target.value)}
                          placeholder="e.g. curl http://target/test.php or hydra ssh..."
                          className="mt-1 w-full rounded border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor={`res-${hypothesis.id}`} className="block text-xs font-medium text-foreground">
                            Observed Result
                          </label>
                          <textarea
                            id={`res-${hypothesis.id}`}
                            rows={2}
                            value={attemptResult}
                            onChange={(e) => setAttemptResult(e.target.value)}
                            placeholder="What happened when executed?"
                            className="mt-1 w-full rounded border border-border bg-background p-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label htmlFor={`out-${hypothesis.id}`} className="block text-xs font-medium text-foreground">
                            Attempt Outcome *
                          </label>
                          <select
                            id={`out-${hypothesis.id}`}
                            value={attemptOutcome}
                            onChange={(e) => setAttemptOutcome(e.target.value as AttemptOutcome)}
                            className="mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="inconclusive">Inconclusive (Need more data)</option>
                            <option value="confirmed">Confirmed (Hypothesis verified)</option>
                            <option value="rejected">Rejected (Hypothesis disproven)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveAttemptHypothesisId(null)}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isPending || !attemptAction.trim()}
                          onClick={() => handleAttemptSubmit(hypothesis.id)}
                          className="text-xs"
                        >
                          Save Attempt
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Linked Attempts */}
                  {linkedAttempts.length > 0 && (
                    <div className="border-t border-border/40 pt-3 space-y-2">
                      <span className="font-mono text-[10px] text-muted-foreground uppercase">
                        Verification Attempts ({linkedAttempts.length})
                      </span>
                      <div className="space-y-1.5">
                        {linkedAttempts.map((attempt) => (
                          <div
                            key={attempt.id}
                            className="flex items-start justify-between gap-3 rounded bg-background/40 p-2 text-xs"
                          >
                            <div className="space-y-0.5">
                              <p className="font-mono font-medium text-foreground">
                                {attempt.action}
                              </p>
                              {attempt.result && (
                                <p className="font-mono text-[11px] text-muted-foreground">
                                  {attempt.result}
                                </p>
                              )}
                            </div>

                            <Badge
                              variant={
                                attempt.outcome === "confirmed"
                                  ? "default"
                                  : attempt.outcome === "rejected"
                                    ? "destructive"
                                    : "secondary"
                              }
                              className="font-mono text-[9px] capitalize shrink-0"
                            >
                              {attempt.outcome}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
