"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Compass,
  ExternalLink,
  Flame,
  Info,
  ListChecks,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MethodologyPhaseReference } from "@/modules/methodology/reference";

interface PhaseDetailProps {
  readonly phase: MethodologyPhaseReference;
  readonly allPhases: readonly MethodologyPhaseReference[];
  readonly onSelectPhase: (phaseKey: string) => void;
}

export function PhaseDetail({
  phase,
  allPhases,
  onSelectPhase,
}: PhaseDetailProps) {
  const currentIndex = allPhases.findIndex(
    (p) => p.semanticKey === phase.semanticKey,
  );
  const prevPhase = currentIndex > 0 ? allPhases[currentIndex - 1] : null;
  const nextPhase =
    currentIndex < allPhases.length - 1 ? allPhases[currentIndex + 1] : null;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-5xl">
      {/* 1. Header Banner & Step Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded border border-emerald-500/40 bg-emerald-500/10 font-mono text-xs font-bold text-emerald-300">
              {phase.phaseNumber}
            </span>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {phase.name}
            </h2>
            <Badge
              variant="outline"
              className="border-border bg-muted/30 font-mono text-[11px] text-muted-foreground"
            >
              Phase {phase.phaseNumber} of {allPhases.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {phase.tagLine}
          </p>
        </div>

        {/* Previous / Next buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            disabled={!prevPhase}
            onClick={() => prevPhase && onSelectPhase(prevPhase.semanticKey)}
            className="font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!nextPhase}
            onClick={() => nextPhase && onSelectPhase(nextPhase.semanticKey)}
            className="font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            Next <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* 2. Purpose Card */}
      <Card className="p-5 border-border bg-card space-y-2">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-foreground/70" />
          <span>Purpose & Operational Objective</span>
        </h3>
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
          {phase.purpose}
        </p>
      </Card>

      {/* 3. Core Verification Checks (From ptesFramework) */}
      <Card className="p-5 border-border bg-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
          <div>
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5 text-emerald-400" />
              <span>Core Verification Checks ({phase.checks.length} Checks)</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Canonical framework checks defining completion criteria for this phase.
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-300 self-start sm:self-auto"
          >
            Framework Definition (PTES)
          </Badge>
        </div>

        <div className="space-y-2.5">
          {phase.checks.map((check, idx) => (
            <div
              key={check.semanticKey}
              className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-background/50 p-3"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted/40 font-mono text-[11px] font-semibold text-muted-foreground mt-0.5">
                  {idx + 1}
                </span>
                <div className="space-y-0.5 min-w-0">
                  <div className="font-mono text-xs font-semibold text-foreground">
                    {check.title}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground/60">
                    Key: {check.semanticKey}
                  </div>
                </div>
              </div>

              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 font-mono text-[10px] uppercase",
                  check.priority === "required"
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                    : check.priority === "recommended"
                      ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                      : "border-border bg-muted/30 text-muted-foreground",
                )}
              >
                {check.priority}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* 4. Why It Matters & Mindset (2-column layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Why It Matters */}
        <Card className="p-5 border-border bg-card space-y-2">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span>Why It Matters</span>
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {phase.whyItMatters}
          </p>
        </Card>

        {/* Mindset */}
        <Card className="p-5 border-border bg-card space-y-2">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-emerald-400" />
            <span>Hacker Mindset</span>
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed italic">
            &ldquo;{phase.mindset}&rdquo;
          </p>
        </Card>
      </div>

      {/* 5. Key Deliverables */}
      {phase.keyDeliverables.length > 0 && (
        <Card className="p-5 border-border bg-card space-y-3">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Key Phase Deliverables</span>
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
            {phase.keyDeliverables.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 6. Related Service Playbooks (Knowledge Base Integration) */}
      {phase.relatedPlaybooks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
              <span>Related Service Playbooks</span>
            </div>
            <Link
              href="/knowledge"
              className="font-mono text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              View All Playbooks <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {phase.relatedPlaybooks.map((pb) => (
              <Card
                key={pb.slug}
                className="p-4 border-border bg-card flex flex-col justify-between gap-3 hover:border-emerald-500/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {pb.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] text-muted-foreground"
                    >
                      {pb.checks.length} checks
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {pb.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Activation: {pb.activationRule.requireAny?.join(", ") || "Contextual"}
                  </span>
                  <Link href={`/knowledge?item=${encodeURIComponent(pb.slug)}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 font-mono text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      View Playbook <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 7. Methodology Resources */}
      {phase.resourceLinks && phase.resourceLinks.length > 0 && (
        <Card className="p-4 border-border bg-card/60 space-y-2">
          <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-foreground/70" />
            <span>Methodology References & Standards</span>
          </h4>
          <div className="flex flex-wrap gap-4 pt-1">
            {phase.resourceLinks.map((res) => (
              <a
                key={res.title}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <span>{res.title}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
