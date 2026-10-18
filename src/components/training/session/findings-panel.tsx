"use client";

import { useState, useTransition } from "react";
import { Lock, Pencil, Plus, ShieldCheck, Tag, X } from "lucide-react";
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
  updateFindingAction,
} from "@/app/training/[sessionId]/actions";
import { normalizeContext } from "@/modules/context/engine";

type ContextKind = (typeof findingContextKindEnum.enumValues)[number];
type ContextKindOption = ContextKind | "none";
type ImportanceLevel = (typeof findingImportanceEnum.enumValues)[number];

interface FindingsPanelProps {
  readonly sessionId: string;
  readonly findings: readonly FindingRecord[];
  readonly isCompleted?: boolean;
}

export function FindingsPanel({
  sessionId,
  findings,
  isCompleted = false,
}: FindingsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFinding, setEditingFinding] = useState<FindingRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Network Service");
  const [evidence, setEvidence] = useState("");
  const [contextKind, setContextKind] = useState<ContextKindOption>("none");
  const [contextValue, setContextValue] = useState("");
  const [importance, setImportance] = useState<ImportanceLevel>("medium");
  const [evidenceState, setEvidenceState] = useState<"observed" | "inferred" | "confirmed">("confirmed");

  // Edit Form states
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editEvidence, setEditEvidence] = useState("");
  const [editContextKind, setEditContextKind] = useState<ContextKindOption>("none");
  const [editContextValue, setEditContextValue] = useState("");
  const [editImportance, setEditImportance] = useState<ImportanceLevel>("medium");
  const [editEvidenceState, setEditEvidenceState] = useState<"observed" | "inferred" | "confirmed">("confirmed");

  const handleStartEdit = (f: FindingRecord) => {
    setError(null);
    setShowAddForm(false);
    setEditingFinding(f);
    setEditTitle(f.title);
    setEditCategory(f.category);
    setEditEvidence(f.evidence);
    setEditContextKind((f.contextKind as ContextKindOption) || "none");
    setEditContextValue(f.contextValue || "");
    setEditImportance(f.importance);
    setEditEvidenceState(f.evidenceState);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFinding) return;
    setError(null);

    startTransition(async () => {
      const normalizedContextKind = editContextKind === "none" || !editContextValue.trim() ? null : editContextKind;
      const normalizedContextValue = normalizedContextKind ? editContextValue.trim() : null;

      const res = await updateFindingAction(sessionId, editingFinding.id, {
        title: editTitle.trim(),
        category: editCategory.trim(),
        evidence: editEvidence.trim(),
        contextKind: normalizedContextKind,
        contextValue: normalizedContextValue,
        importance: editImportance,
        evidenceState: editEvidenceState,
      });

      if (!res.ok) {
        setError(res.error);
      } else {
        setEditingFinding(null);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const normalizedContextKind = contextKind === "none" || !contextValue.trim() ? null : contextKind;
      const normalizedContextValue = normalizedContextKind ? contextValue.trim() : null;

      const res = await createFindingAction(sessionId, {
        title: title.trim(),
        category: category.trim(),
        evidence: evidence.trim(),
        contextKind: normalizedContextKind,
        contextValue: normalizedContextValue,
        importance,
        evidenceState,
      });

      if (!res.ok) {
        setError(res.error);
      } else {
        setTitle("");
        setEvidence("");
        setContextValue("");
        setContextKind("none");
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
      {isCompleted && (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300">
          <Lock className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            Training session is completed. Findings are locked in read-only mode.
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Discovered Evidence & Findings ({findings.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Document target discoveries. Confirmed findings dynamically activate relevant methodology playbooks.
          </p>
        </div>

        {!isCompleted && (
          <Button
            type="button"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Finding
          </Button>
        )}
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
            const isEditing = editingFinding?.id === finding.id;

            if (isEditing) {
              return (
                <Card key={finding.id} className="border-primary/40 bg-card">
                  <CardHeader className="py-3.5 px-4 sm:px-5 border-b border-border/60">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Edit Finding
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingFinding(null)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5">
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                      {error && <p className="text-xs text-destructive">{error}</p>}

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label htmlFor={`edit-title-${finding.id}`} className="block text-xs font-medium text-foreground">
                            Title *
                          </label>
                          <input
                            id={`edit-title-${finding.id}`}
                            type="text"
                            required
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label htmlFor={`edit-cat-${finding.id}`} className="block text-xs font-medium text-foreground">
                            Category *
                          </label>
                          <input
                            id={`edit-cat-${finding.id}`}
                            type="text"
                            required
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor={`edit-evidence-${finding.id}`} className="block text-xs font-medium text-foreground">
                          Evidence Details / Command Output *
                        </label>
                        <textarea
                          id={`edit-evidence-${finding.id}`}
                          required
                          rows={3}
                          value={editEvidence}
                          onChange={(e) => setEditEvidence(e.target.value)}
                          className="mt-1 w-full rounded border border-border bg-background p-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label htmlFor={`edit-kind-${finding.id}`} className="block text-xs font-medium text-foreground">
                            Context Kind
                          </label>
                          <select
                            id={`edit-kind-${finding.id}`}
                            value={editContextKind}
                            onChange={(e) => setEditContextKind(e.target.value as ContextKindOption)}
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
                          <label htmlFor={`edit-val-${finding.id}`} className="block text-xs font-medium text-foreground">
                            Context Value
                          </label>
                          <input
                            id={`edit-val-${finding.id}`}
                            type="text"
                            value={editContextValue}
                            onChange={(e) => setEditContextValue(e.target.value)}
                            placeholder="e.g. Apache, OpenSSH, Linux"
                            className="mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div>
                          <label htmlFor={`edit-imp-${finding.id}`} className="block text-xs font-medium text-foreground">
                            Importance
                          </label>
                          <select
                            id={`edit-imp-${finding.id}`}
                            value={editImportance}
                            onChange={(e) => setEditImportance(e.target.value as ImportanceLevel)}
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
                              name={`edit-state-${finding.id}`}
                              value="confirmed"
                              checked={editEvidenceState === "confirmed"}
                              onChange={() => setEditEvidenceState("confirmed")}
                            />
                            <span className="font-semibold text-primary">Confirmed (activates Playbooks)</span>
                          </label>
                          <label className="flex items-center gap-1.5 text-muted-foreground cursor-pointer">
                            <input
                              type="radio"
                              name={`edit-state-${finding.id}`}
                              value="observed"
                              checked={editEvidenceState === "observed"}
                              onChange={() => setEditEvidenceState("observed")}
                            />
                            <span>Observed</span>
                          </label>
                          <label className="flex items-center gap-1.5 text-muted-foreground cursor-pointer">
                            <input
                              type="radio"
                              name={`edit-state-${finding.id}`}
                              value="inferred"
                              checked={editEvidenceState === "inferred"}
                              onChange={() => setEditEvidenceState("inferred")}
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
                          onClick={() => setEditingFinding(null)}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={isPending} className="text-xs">
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              );
            }

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

                      {finding.contextKind && finding.contextValue && (() => {
                        const canonicalKeys = normalizeContext(
                          finding.contextKind as ContextKind,
                          finding.contextValue,
                        );

                        return (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground font-mono">
                            <Tag className="h-3 w-3 text-primary" />
                            <span>Context:</span>
                            <span className="font-semibold text-foreground">
                              {finding.contextKind}:{finding.contextValue}
                            </span>
                            {canonicalKeys.length > 0 && (
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                → {canonicalKeys.join(", ")}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                      {!isCompleted && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleStartEdit(finding)}
                          className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Button>
                      )}
                      {!isConfirmed && !isCompleted && (
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          disabled={isPending}
                          onClick={() => handleConfirm(finding.id)}
                          className="gap-1.5 text-xs font-medium"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Confirm Evidence
                        </Button>
                      )}
                    </div>
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
