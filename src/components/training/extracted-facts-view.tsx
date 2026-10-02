"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Code2,
  Flag,
  KeyRound,
  Network,
  Server,
  ShieldAlert,
  Terminal,
} from "lucide-react";
import type { ExtractedMachineFacts } from "@/modules/facts/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ExtractedFactsViewProps {
  facts: ExtractedMachineFacts;
}

export function ExtractedFactsView({ facts }: ExtractedFactsViewProps) {
  const [showJson, setShowJson] = useState(false);

  const { profile, services, vulnerabilities, findings, objectives, attackSteps, summary } =
    facts;

  return (
    <Card role="region" aria-labelledby="extracted-facts-title" className="border-primary/30">
      <CardHeader className="border-b border-border bg-background/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Server className="size-4 text-primary" />
              <h2 id="extracted-facts-title" className="text-base font-semibold text-foreground">
                Extracted Machine Knowledge: {profile.name}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">{summary}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-xs uppercase text-primary border-primary/40">
              {profile.os}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {profile.platform}
            </Badge>
            <Badge
              variant="outline"
              className={
                profile.difficulty === "easy"
                  ? "border-emerald-500/40 text-emerald-400"
                  : profile.difficulty === "medium"
                    ? "border-amber-500/40 text-amber-400"
                    : profile.difficulty === "hard" || profile.difficulty === "insane"
                      ? "border-rose-500/40 text-rose-400"
                      : "text-muted-foreground"
              }
            >
              {profile.difficulty}
            </Badge>
            {profile.targetIp && (
              <Badge variant="secondary" className="font-mono text-xs">
                {profile.targetIp}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-5">
        {/* Network Services */}
        {services.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Network className="size-3.5 text-primary" />
              <span>Network Services ({services.length})</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((svc) => (
                <div
                  key={`${svc.port}-${svc.protocol}`}
                  className="rounded-md border border-border bg-card/60 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-medium text-foreground">
                      {svc.port}/{svc.protocol}
                    </span>
                    <Badge variant="secondary" className="text-[11px] font-mono">
                      {svc.service}
                    </Badge>
                  </div>
                  {(svc.product || svc.version) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {svc.product} {svc.version}
                    </p>
                  )}
                  <p className="border-l-2 border-border/80 pl-2 text-[11px] italic text-muted-foreground line-clamp-2">
                    {svc.provenance}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vulnerabilities */}
        {vulnerabilities.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ShieldAlert className="size-3.5 text-rose-400" />
              <span>Identified Vulnerabilities ({vulnerabilities.length})</span>
            </div>
            <div className="space-y-2">
              {vulnerabilities.map((vuln, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-border bg-card/60 p-3 space-y-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {vuln.title}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {vuln.cve && (
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {vuln.cve}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          vuln.severity === "critical" || vuln.severity === "high"
                            ? "border-rose-500/40 text-rose-400"
                            : vuln.severity === "medium"
                              ? "border-amber-500/40 text-amber-400"
                              : "border-blue-500/40 text-blue-400"
                        }
                      >
                        {vuln.severity}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{vuln.description}</p>
                  <p className="border-l-2 border-border/80 pl-2 text-[11px] italic text-muted-foreground">
                    Evidence: {vuln.provenance}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Findings & Credentials */}
        {findings.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <KeyRound className="size-3.5 text-amber-400" />
              <span>Discovered Findings & Credentials ({findings.length})</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {findings.map((f, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-border bg-card/60 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-medium text-amber-300 font-mono">
                      {f.identifier}
                    </code>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {f.kind.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                  <p className="border-l-2 border-border/80 pl-2 text-[11px] italic text-muted-foreground">
                    {f.provenance}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Objectives / Flags */}
        {objectives.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Flag className="size-3.5 text-primary" />
              <span>Capture Objectives ({objectives.length})</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {objectives.map((obj, idx) => (
                <div
                  key={idx}
                  className="rounded-md border border-border bg-card/60 p-3 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{obj.name}</span>
                    <Badge variant="outline" className="text-[10px] uppercase text-primary border-primary/40">
                      {obj.type.replace("_", " ")}
                    </Badge>
                  </div>
                  {obj.location && (
                    <p className="font-mono text-xs text-muted-foreground">
                      Location: {obj.location}
                    </p>
                  )}
                  <p className="border-l-2 border-border/80 pl-2 text-[11px] italic text-muted-foreground">
                    {obj.provenance}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attack Steps */}
        {attackSteps.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Terminal className="size-3.5 text-primary" />
              <span>Attack Milestones & Chronology ({attackSteps.length})</span>
            </div>
            <div className="space-y-2">
              {attackSteps.map((step) => (
                <div
                  key={step.stepNumber}
                  className="flex items-start gap-3 rounded-md border border-border bg-card/60 p-3"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary">
                    {step.stepNumber}
                  </span>
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">{step.action}</p>
                      <Badge variant="outline" className="text-[10px] capitalize text-muted-foreground">
                        {step.phase.replace("_", " ")}
                      </Badge>
                    </div>
                    {step.toolsUsed.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Tools: <span className="font-mono text-primary/80">{step.toolsUsed.join(", ")}</span>
                      </p>
                    )}
                    <p className="border-l-2 border-border/80 pl-2 text-[11px] italic text-muted-foreground">
                      {step.provenance}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw JSON Toggle */}
        <div className="border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowJson(!showJson)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Code2 className="size-3.5" />
            <span>{showJson ? "Hide Raw Ground-Truth JSON" : "Inspect Raw Ground-Truth JSON"}</span>
            {showJson ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </Button>

          {showJson && (
            <pre className="mt-2 max-h-96 overflow-auto rounded-md border border-border bg-black/60 p-3 font-mono text-[11px] text-emerald-400">
              {JSON.stringify(facts, null, 2)}
            </pre>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
