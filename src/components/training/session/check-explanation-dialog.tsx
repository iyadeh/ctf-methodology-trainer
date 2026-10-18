"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Compass,
  Copy,
  HelpCircle,
  RefreshCw,
  Shield,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SessionCheckRecord } from "@/modules/training/types";
import type { CheckExplanationResult } from "@/modules/checklist/explanation";
import { getCheckExplanationAction } from "@/app/training/[sessionId]/actions";

interface CheckExplanationDialogProps {
  readonly sessionId: string;
  readonly check: SessionCheckRecord | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function CheckExplanationDialog({
  sessionId,
  check,
  isOpen,
  onClose,
}: CheckExplanationDialogProps) {
  const [data, setData] = useState<CheckExplanationResult | null>(null);
  const [loadedCheckId, setLoadedCheckId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const isLoading = Boolean(
    check && (loadedCheckId !== check.id || isRetrying || isPending) && !error,
  );

  useEffect(() => {
    if (!isOpen || !check) {
      return;
    }

    let isMounted = true;

    startTransition(async () => {
      const res = await getCheckExplanationAction(sessionId, check.id);
      if (!isMounted) return;

      if (!res.ok) {
        setError(res.error);
        setIsRetrying(false);
        return;
      }

      setData(res.data);
      setLoadedCheckId(check.id);
      setError(null);
      setIsRetrying(false);
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, check, sessionId]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !check) return null;

  const handleCopyCommand = async (command: string, index: number) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedIndex(index);
      setTimeout(() => {
        setCopiedIndex(null);
      }, 2000);
    } catch {
      // Ignore clipboard write failures in non-secure contexts
    }
  };

  const handleRetry = () => {
    if (!check) return;
    setError(null);
    setIsRetrying(true);
    startTransition(async () => {
      const res = await getCheckExplanationAction(sessionId, check.id);
      if (!res.ok) {
        setError(res.error);
      } else {
        setData(res.data);
        setLoadedCheckId(check.id);
      }
      setIsRetrying(false);
    });
  };

  const explanation = data?.explanation;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="explanation-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border/70 p-4 sm:p-5 bg-muted/20">
          <div className="space-y-1.5 pr-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "font-mono text-[9px] uppercase tracking-wide",
                  check.priority === "required" && "border-amber-500/50 text-amber-400 bg-amber-500/10",
                  check.priority === "recommended" && "border-blue-500/50 text-blue-400 bg-blue-500/10",
                  check.priority === "suggested" && "border-zinc-500/50 text-zinc-400 bg-zinc-500/10",
                )}
              >
                {check.priority}
              </Badge>
              <Badge variant="outline" className="font-mono text-[9px] text-muted-foreground border-border/80">
                {check.provenance}
              </Badge>
              {data && (
                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono text-[9px] gap-1",
                    data.source === "ai"
                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                      : "border-border text-muted-foreground bg-muted/30",
                  )}
                >
                  {data.source === "ai" ? (
                    <>
                      <Sparkles className="h-2.5 w-2.5" />
                      AI Grounded
                    </>
                  ) : (
                    "Playbook Standard"
                  )}
                </Badge>
              )}
            </div>

            <h2 id="explanation-dialog-title" className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {check.title}
            </h2>

            <p className="font-mono text-[11px] text-muted-foreground">
              {check.semanticKey}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {isLoading ? (
            <div className="space-y-4 py-8">
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">
                    Analyzing methodology & grounding evidence...
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Synthesizing PTES principles and terminal commands
                  </p>
                </div>
              </div>

              {/* Skeleton placeholders */}
              <div className="space-y-3 pt-4">
                <div className="h-20 w-full animate-pulse rounded-md bg-muted/40" />
                <div className="h-24 w-full animate-pulse rounded-md bg-muted/30" />
                <div className="h-32 w-full animate-pulse rounded-md bg-muted/20" />
              </div>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-center space-y-3 my-6">
              <div className="flex items-center justify-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <p className="text-xs font-semibold">Failed to load explanation</p>
              </div>
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="text-xs gap-1.5 border-destructive/30"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          ) : explanation ? (
            <div className="space-y-5">
              {/* Layer 1: The "Why" - PTES Methodology Principle */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-primary font-mono text-[11px] font-semibold uppercase tracking-wider">
                  <Shield className="h-3.5 w-3.5 shrink-0" />
                  <span>Layer 1: The &ldquo;Why&rdquo; • PTES Methodology Principle</span>
                </div>

                <Card className="border-border/80 bg-card/60 shadow-none">
                  <CardContent className="p-3.5 space-y-2.5">
                    <div className="rounded-r border-l-2 border-primary bg-primary/[0.04] p-2.5">
                      <p className="text-xs font-semibold text-foreground leading-snug">
                        {explanation.why.principle}
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {explanation.why.importance}
                    </p>

                    <div className="flex items-start gap-2 pt-1 border-t border-border/50 text-[11px] text-foreground/80">
                      <Compass className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                      <span className="italic">
                        <strong className="font-medium text-foreground not-italic">Mindset: </strong>
                        {explanation.why.mindset}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Layer 2: The "What" - Machine Context */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-blue-400 font-mono text-[11px] font-semibold uppercase tracking-wider">
                  <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Layer 2: The &ldquo;What&rdquo; • Engagement Evidence Context</span>
                </div>

                <Card className="border-border/80 bg-card/60 shadow-none">
                  <CardContent className="p-3.5 space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {explanation.what.contextSummary}
                    </p>

                    {explanation.what.applicableFindings.length > 0 ? (
                      <div className="space-y-1.5">
                        <span className="font-mono text-[10px] uppercase text-muted-foreground font-medium">
                          Applicable Confirmed Assets & Findings:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {explanation.what.applicableFindings.map((finding) => (
                            <Badge
                              key={finding}
                              variant="outline"
                              className="font-mono text-[10px] bg-muted/30 border-border/80 text-foreground"
                            >
                              {finding}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] italic text-muted-foreground">
                        No target-specific findings confirmed yet. This check guides initial discovery for this phase.
                      </p>
                    )}

                    <div className="rounded bg-muted/20 p-2 text-[11px] text-muted-foreground border border-border/40">
                      <strong className="text-foreground font-medium">Phase Relevance: </strong>
                      {explanation.what.relevance}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Layer 3: The "How" - Terminal Commands & Tools */}
              <section className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px] font-semibold uppercase tracking-wider">
                  <Terminal className="h-3.5 w-3.5 shrink-0" />
                  <span>Layer 3: The &ldquo;How&rdquo; • Actionable Terminal Execution</span>
                </div>

                <Card className="border-border/80 bg-card/60 shadow-none">
                  <CardContent className="p-3.5 space-y-3.5">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {explanation.how.approach}
                    </p>

                    {/* Commands List */}
                    <div className="space-y-2.5">
                      {explanation.how.commands.map((cmd, idx) => {
                        const isCopied = copiedIndex === idx;

                        return (
                          <div
                            key={idx}
                            className="rounded-md border border-border/80 bg-zinc-950/70 p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-foreground">
                                {cmd.label}
                              </span>
                              <Badge
                                variant="outline"
                                className="font-mono text-[9px] uppercase border-primary/30 text-primary bg-primary/10 shrink-0"
                              >
                                {cmd.tool}
                              </Badge>
                            </div>

                            {/* Command Line & Copy Button */}
                            <div className="flex items-center justify-between gap-2 rounded bg-black/80 px-3 py-2 border border-border/50">
                              <code className="font-mono text-xs text-emerald-400 select-all overflow-x-auto whitespace-pre">
                                {cmd.command}
                              </code>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyCommand(cmd.command, idx)}
                                className={cn(
                                  "h-6 px-2 text-[10px] font-mono shrink-0 gap-1 transition-all",
                                  isCopied
                                    ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                                )}
                                title="Copy command to clipboard"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="h-3 w-3 stroke-[3]" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </Button>
                            </div>

                            {cmd.description && (
                              <p className="text-[11px] text-muted-foreground leading-normal pl-1">
                                {cmd.description}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Expected Signals */}
                    {explanation.how.expectedSignals.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-border/50">
                        <span className="font-mono text-[10px] uppercase text-muted-foreground font-medium">
                          Indicators & Expected Signals:
                        </span>
                        <ul className="space-y-1 pl-1">
                          {explanation.how.expectedSignals.map((signal, sIdx) => (
                            <li
                              key={sIdx}
                              className="flex items-start gap-2 text-xs text-muted-foreground"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                              <span>{signal}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/70 p-3 sm:px-5 bg-muted/20 text-xs">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            Spoiler-safe • Grounded in confirmed evidence
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
