"use client";

import { useState, useTransition } from "react";
import { Plus, ShieldCheck, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FindingRecord } from "@/modules/training/types";
import {
  findingContextKindEnum,
  findingImportanceEnum,
} from "@/lib/db/schema";
import {
  confirmFindingAction,
  createFindingAction,
} from "@/app/training/[sessionId]/actions";

type ContextKind = (typeof findingContextKindEnum.enumValues)[number];
type ContextKindOption = ContextKind | "none";
type ImportanceLevel = (typeof findingImportanceEnum.enumValues)[number];

interface FindingsPanelProps {
  readonly sessionId: string;
  readonly findings: readonly FindingRecord[];
}

export function FindingsPanel({ sessionId, findings }: FindingsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Network Service");
  const [evidence, setEvidence] = useState("");
  const [contextKind, setContextKind] = useState<ContextKindOption>("service");
  const [contextValue, setContextValue] = useState("");
  const [importance, setImportance] = useState<ImportanceLevel>("medium");
  const [evidenceState, setEvidenceState] = useState<"observed" | "inferred" | "confirmed">("confirmed");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await createFindingAction(sessionId, {
        title: title.trim(),
        category: category.trim(),
        evidence: evidence.trim(),
        contextKind: contextKind === "none" ? null : contextKind,
        contextValue: contextKind === "none" || !contextValue.trim() ? null : contextValue.trim(),
        importance,
        evidenceState,
      });

      if (!res.ok) {
        setError(res.error);
      } else {
        setTitle("");
        setEvidence("");
        setContextValue("");
        setShowAddForm(false);
      }
    });
  };

  const handleConfirm = (findingId: string) => {
    startTransition(async () => {
      await confirmFindingAction(sessionId, findingId);
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Discovered Evidence & Findings ({findings.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Document target discoveries. Confirmed findings dynamically activate relevant methodology playbooks.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Finding
        </Button>
      </div>

      {showAddForm && (
        <Card className="border-primary/40 bg-card">
          <CardHeader className="py-3.5 px-4 sm:px-5 border-b border-border/60">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-primary">
              New Finding
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="f-title" className="block text-xs font-medium text-foreground">
                    Title *
                  </label>
                  <input
                    id="f-title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Apache Web Server on port 80"
                    className="mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="f-cat" className="block text-xs font-medium text-foreground">
                    Category *
                  </label>
                  <input
                    id="f-cat"
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Network Service, Attack Surface, Credential"
                    className="mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="f-evidence" className="block text-xs font-medium text-foreground">
                  Evidence Details / Command Output *
                </label>
                <textarea
                  id="f-evidence"
                  required
                  rows={3}
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="Paste tool output, banner, or URL observation..."
                  className="mt-1 w-full rounded border border-border bg-background p-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="f-kind" className="block text-xs font-medium text-foreground">
                    Context Kind
                  </label>
                  <select
                    id="f-kind"
                    value={contextKind}
                    onChange={(e) => setContextKind(e.target.value as ContextKindOption)}
                    className="mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="none">(None)</option>
                    <option value="service">Service (e.g. HTTP, SSH, FTP)</option>
                    <option value="protocol">Protocol (e.g. HTTPS, DNS)</option>
                    <option value="os">OS (e.g. Linux, Windows)</option>
                    <option value="surface">Surface (e.g. web, auth, api)</option>
                    <option value="technology">Technology (e.g. WordPress, Drupal)</option>
                    <option value="access">Access (e.g. local-shell)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="f-val" className="block text-xs font-medium text-foreground">
                    Context Value
                  </label>
                  <input
                    id="f-val"
                    type="text"
                    value={contextValue}
                    onChange={(e) => setContextValue(e.target.value)}
                    placeholder="e.g. Apache, OpenSSH, Linux"
                    className="mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="f-imp" className="block text-xs font-medium text-foreground">
                    Importance
                  </label>
                  <select
                    id="f-imp"
                    value={importance}
                    onChange={(e) => setImportance(e.target.value as ImportanceLevel)}
                    className="mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground">
                  Evidence State
                </label>
                <div className="mt-1.5 flex gap-4 text-xs">
                  <label className="flex items-center gap-1.5 text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="state"
                      value="confirmed"
                      checked={evidenceState === "confirmed"}
                      onChange={() => setEvidenceState("confirmed")}
                    />
                    <span className="font-semibold text-primary">Confirmed (activates Playbooks)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-muted-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="state"
                      value="observed"
                      checked={evidenceState === "observed"}
                      onChange={() => setEvidenceState("observed")}
                    />
                    <span>Observed</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-muted-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="state"
                      value="inferred"
                      checked={evidenceState === "inferred"}
                      onChange={() => setEvidenceState("inferred")}
                    />
                    <span>Inferred</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="text-xs">
                  Save Finding
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Findings list */}
      {findings.length === 0 ? (
        <Card className="border-dashed text-center">
          <CardContent className="py-12">
            <p className="text-sm text-muted-foreground">
              No findings recorded yet. Record services and facts discovered during enumeration.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {findings.map((finding) => {
            const isConfirmed = finding.evidenceState === "confirmed";

            return (
              <Card key={finding.id} className="border-border/80 bg-card/60">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold tracking-tight text-foreground">
                          {finding.title}
                        </h3>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {finding.category}
                        </Badge>
                        <Badge
                          variant={
                            finding.importance === "high"
                              ? "destructive"
                              : finding.importance === "medium"
                                ? "default"
                                : "secondary"
                          }
                          className="font-mono text-[10px] capitalize"
                        >
                          {finding.importance}
                        </Badge>
                        <Badge
                          variant={isConfirmed ? "default" : "outline"}
                          className={cn(
                            "font-mono text-[10px] capitalize",
                            isConfirmed && "border-primary bg-primary/10 text-primary",
                          )}
                        >
                          {finding.evidenceState}
                        </Badge>
                      </div>

                      <pre className="max-h-32 overflow-x-auto rounded bg-background/80 p-2 font-mono text-xs text-foreground/90 whitespace-pre-wrap">
                        {finding.evidence}
                      </pre>

                      {finding.contextKind && finding.contextValue && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                          <Tag className="h-3 w-3 text-primary" />
                          <span>Context:</span>
                          <span className="font-semibold text-foreground">
                            {finding.contextKind}:{finding.contextValue}
                          </span>
                        </div>
                      )}
                    </div>

                    {!isConfirmed && (
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        disabled={isPending}
                        onClick={() => handleConfirm(finding.id)}
                        className="shrink-0 gap-1.5 text-xs font-medium self-end sm:self-start"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Confirm Evidence
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
