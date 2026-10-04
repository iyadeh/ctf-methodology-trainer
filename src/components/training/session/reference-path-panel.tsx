"use client";

import { useState } from "react";
import {
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Compass,
  FileQuestion,
  Flag,
  Globe,
  LockOpen,
  Milestone,
  ShieldCheck,
  Terminal,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RevealedReferencePath, RevealedReferencePathNode } from "@/modules/training/completion";

interface ReferencePathPanelProps {
  readonly referencePath: RevealedReferencePath | null;
}

function getPhaseBadgeColor(phase: string) {
  switch (phase.toLowerCase()) {
    case "reconnaissance":
      return "border-sky-500/40 text-sky-400 bg-sky-500/10";
    case "threat_modeling":
      return "border-indigo-500/40 text-indigo-400 bg-indigo-500/10";
    case "vulnerability_analysis":
      return "border-amber-500/40 text-amber-400 bg-amber-500/10";
    case "exploitation":
      return "border-rose-500/40 text-rose-400 bg-rose-500/10";
    case "post_exploitation":
      return "border-emerald-500/40 text-emerald-400 bg-emerald-500/10";
    default:
      return "border-zinc-500/40 text-zinc-400 bg-zinc-500/10";
  }
}

function formatKindLabel(kind: string) {
  return kind.replace(/_/g, " ").toUpperCase();
}

function NodeCard({
  node,
  stepNumber,
  isLast,
}: {
  node: RevealedReferencePathNode;
  stepNumber: number;
  isLast: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center">
      <div className="w-full rounded-lg border border-border bg-card p-4 sm:p-5 transition-colors hover:border-border/80">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              STEP {String(stepNumber).padStart(2, "0")}
            </span>
            <Badge
              variant="outline"
              className={cn("font-mono text-[10px] uppercase font-semibold", getPhaseBadgeColor(node.phase))}
            >
              {node.phase.replace(/_/g, " ")}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground border-border/60">
              {formatKindLabel(node.kind)}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            {node.isEntryPoint && (
              <span className="inline-flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-blue-400">
                <Globe className="h-3 w-3" />
                ENTRY POINT
              </span>
            )}
            {node.isTerminal && (
              <span className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                <Flag className="h-3 w-3 text-emerald-400" />
                OBJECTIVE / GOAL
              </span>
            )}
          </div>
        </div>

        <h4 className="mt-2.5 text-sm sm:text-base font-semibold text-foreground">
          {node.title}
        </h4>

        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {node.description}
        </p>

        {/* Node Metadata (Ports, Service, Tools) */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-3 border-t border-border/50 text-[11px] font-mono text-muted-foreground">
          {node.port !== undefined && (
            <span className="inline-flex items-center gap-1 rounded bg-muted/40 px-2 py-0.5 border border-border/40">
              <Terminal className="h-3 w-3 text-primary" />
              Port: {node.port}{node.protocol ? `/${node.protocol}` : ""}
            </span>
          )}
          {node.service && (
            <span className="inline-flex items-center gap-1 rounded bg-muted/40 px-2 py-0.5 border border-border/40">
              <Compass className="h-3 w-3 text-primary" />
              Service: {node.service}
            </span>
          )}
          {node.cve && (
            <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 text-rose-400 font-semibold">
              CVE: {node.cve}
            </span>
          )}
          {node.location && (
            <span className="inline-flex items-center gap-1 rounded bg-muted/40 px-2 py-0.5 border border-border/40">
              Loc: {node.location}
            </span>
          )}
          {node.toolsUsed && node.toolsUsed.length > 0 && (
            <div className="inline-flex items-center gap-1 rounded bg-muted/40 px-2 py-0.5 border border-border/40">
              <Wrench className="h-3 w-3 text-primary" />
              <span>Tools:</span>
              <span className="text-foreground font-semibold">
                {node.toolsUsed.join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Downward Connector Arrow */}
      {!isLast && (
        <div className="flex flex-col items-center my-1.5 py-1">
          <div className="h-4 w-px bg-border/80" />
          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
            <ArrowDown className="h-3 w-3 text-primary" />
          </div>
          <div className="h-4 w-px bg-border/80" />
        </div>
      )}
    </div>
  );
}

export function ReferencePathPanel({ referencePath }: ReferencePathPanelProps) {
  const [showAllNodes, setShowAllNodes] = useState(false);

  if (!referencePath || !referencePath.available) {
    return (
      <div className="p-4 sm:p-6">
        <Card className="flex flex-col items-center justify-center border-dashed border-border/80 bg-card/30 p-8 sm:p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
            <FileQuestion className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">
            No Writeup Reference Path Available
          </h3>
          <p className="mt-1.5 max-w-md text-xs text-muted-foreground leading-relaxed">
            This training session is a Manual Practice Session or was created without an attached writeup attack graph. Reference solutions are automatically unlocked for sessions generated from verified writeups.
          </p>
        </Card>
      </div>
    );
  }

  const { machineName, referencePathNodes, allNodes, edges } = referencePath;
  const pathNodeIds = new Set(referencePathNodes.map((n) => n.id));
  const alternativeNodes = allNodes.filter((n) => !pathNodeIds.has(n.id));

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Banner / Header */}
      <div className="rounded-lg border border-primary/30 bg-primary/[0.04] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary">
              <LockOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  Reference Attack Path Unlocked
                </h3>
                <Badge
                  variant="outline"
                  className="border-primary/40 bg-primary/10 font-mono text-[10px] text-primary"
                >
                  REVEALED
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Target: <span className="font-semibold text-foreground">{machineName || "Machine"}</span> • {referencePathNodes.length} Verified Attack Steps • {edges.length} Dependency Edges
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Verified Writeup Path
            </span>
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground/90 leading-relaxed border-t border-primary/20 pt-2.5">
          This reference path was securely extracted from the writeup and verified against the PTES framework. It represents the canonical exploitation sequence from initial reconnaissance to objective capture.
        </p>
      </div>

      {/* Path Sequence */}
      <div className="space-y-1">
        <div className="flex items-center justify-between pb-2">
          <h4 className="flex items-center gap-2 text-xs font-mono font-semibold uppercase text-muted-foreground">
            <Milestone className="h-3.5 w-3.5 text-primary" />
            Canonical Attack Chain Sequence
          </h4>
          <span className="text-[11px] font-mono text-muted-foreground">
            {referencePathNodes.length} Steps
          </span>
        </div>

        <div className="space-y-0">
          {referencePathNodes.map((node, index) => (
            <NodeCard
              key={node.id}
              node={node}
              stepNumber={index + 1}
              isLast={index === referencePathNodes.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Alternative Graph Nodes (if graph has branched nodes) */}
      {alternativeNodes.length > 0 && (
        <div className="pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => setShowAllNodes(!showAllNodes)}
            className="flex items-center justify-between w-full p-3 rounded-lg border border-border bg-card/50 text-left hover:bg-card transition-colors"
          >
            <div className="flex items-center gap-2">
              {showAllNodes ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-xs font-semibold text-foreground">
                Alternative & Supplemental Graph Nodes ({alternativeNodes.length})
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {showAllNodes ? "Collapse" : "Expand"}
            </span>
          </button>

          {showAllNodes && (
            <div className="mt-3 space-y-3 pl-4 border-l border-border/80">
              {alternativeNodes.map((node, i) => (
                <div
                  key={node.id}
                  className="rounded-lg border border-border/70 bg-card/40 p-4 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      ALT #{i + 1}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("font-mono text-[9px] uppercase", getPhaseBadgeColor(node.phase))}
                    >
                      {node.phase}
                    </Badge>
                    <span className="font-semibold text-foreground text-xs">
                      {node.title}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground text-[11px] leading-relaxed">
                    {node.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
