"use client";

import { useState, useTransition } from "react";
import { Check, Lightbulb, Loader2, Lock, Pencil, Plus, ShieldCheck, Sparkles, Tag, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { cn } from "@/lib/utils";
import type { FindingRecord } from "@/modules/training/types";
import {
  findingContextKindEnum,
  findingImportanceEnum,
} from "@/lib/db/schema";
import {
  applyFindingContextSuggestionAction,
  confirmFindingAction,
  createFindingAction,
  deleteFindingAction,
  suggestFindingContextAction,
  updateFindingAction,
} from "@/app/training/[sessionId]/actions";
import { normalizeContext } from "@/modules/context/engine";
import type { ContextSuggestion } from "@/modules/context/ai-suggestion";

type ContextKind = (typeof findingContextKindEnum.enumValues)[number];
type ContextKindOption = ContextKind | "none";
type ImportanceLevel = (typeof findingImportanceEnum.enumValues)[number];

const CONTEXT_CHIPS = [
  { label: "HTTP", kind: "service", value: "http" },
  { label: "SSH", kind: "service", value: "ssh" },
  { label: "SMB", kind: "service", value: "smb" },
  { label: "FTP", kind: "service", value: "ftp" },
  { label: "DNS", kind: "service", value: "dns" },
  { label: "MySQL", kind: "service", value: "mysql" },
  { label: "local-shell", kind: "access", value: "local-shell" },
  { label: "root-shell", kind: "access", value: "root-shell" },
  { label: "Linux", kind: "os", value: "linux" },
  { label: "Windows", kind: "os", value: "windows" },
  { label: "web", kind: "surface", value: "web" },
  { label: "auth", kind: "surface", value: "auth" },
] as const;

interface FindingsPanelProps {
  readonly sessionId: string;
  readonly findings: readonly FindingRecord[];
  readonly isCompleted?: boolean;
  readonly onFormulateHypothesis?: (findingId: string, findingTitle: string) => void;
}

export function FindingsPanel({
  sessionId,
  findings,
  isCompleted = false,
  onFormulateHypothesis,
}: FindingsPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFinding, setEditingFinding] = useState<FindingRecord | null>(null);
  const [findingToDelete, setFindingToDelete] = useState<FindingRecord | null>(null);
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

  // AI Context Suggestion states
  const [isDetectingContextAdd, setIsDetectingContextAdd] = useState(false);
  const [addFormAiNotice, setAddFormAiNotice] = useState<string | null>(null);
  const [isDetectingContextEdit, setIsDetectingContextEdit] = useState(false);
  const [editFormAiNotice, setEditFormAiNotice] = useState<string | null>(null);
  const [cardSuggestions, setCardSuggestions] = useState<Record<string, ContextSuggestion>>({});
  const [detectingCard, setDetectingCard] = useState<Record<string, boolean>>({});
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Record<string, boolean>>({});

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

  const handleConfirmDeleteFinding = () => {
    if (!findingToDelete) return;
    const findingId = findingToDelete.id;
    setError(null);
    startTransition(async () => {
      const res = await deleteFindingAction(sessionId, findingId);
      if (!res.ok) {
        setError(res.error);
      } else {
        setFindingToDelete(null);
      }
    });
  };

  const handleAutoDetectAdd = async () => {
    if (!title.trim() && !evidence.trim()) {
      setError("Please enter a Title or Evidence details first so AI can analyze the context.");
      return;
    }
    setError(null);
    setIsDetectingContextAdd(true);
    setAddFormAiNotice(null);

    try {
      const res = await suggestFindingContextAction(sessionId, {
        title: title.trim(),
        evidence: evidence.trim(),
        category: category.trim(),
        currentContextKind: contextKind === "none" ? null : contextKind,
        currentContextValue: contextValue.trim() || null,
      });

      if (res.ok && res.data.hasSuggestion && res.data.contextKind && res.data.contextValue) {
        setContextKind(res.data.contextKind as ContextKindOption);
        setContextValue(res.data.contextValue);
        if (res.data.category && (!category || category === "Network Service")) {
          setCategory(res.data.category);
        }
        setAddFormAiNotice(
          `✨ Auto-detected: ${res.data.contextKind}:${res.data.contextValue} — ${res.data.reasoning}${res.data.activatesPlaybook ? ` (Activates ${res.data.activatesPlaybook})` : ""}`
        );
      } else if (res.ok) {
        setAddFormAiNotice(
          res.data.reasoning || "No canonical context could be detected automatically. You can choose manually."
        );
      } else {
        setError(res.error || "Failed to auto-detect context");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error auto-detecting context");
    } finally {
      setIsDetectingContextAdd(false);
    }
  };

  const handleAutoDetectEdit = async () => {
    if (!editTitle.trim() && !editEvidence.trim()) {
      setError("Please enter a Title or Evidence details first so AI can analyze the context.");
      return;
    }
    setError(null);
    setIsDetectingContextEdit(true);
    setEditFormAiNotice(null);

    try {
      const res = await suggestFindingContextAction(sessionId, {
        title: editTitle.trim(),
        evidence: editEvidence.trim(),
        category: editCategory.trim(),
        currentContextKind: editContextKind === "none" ? null : editContextKind,
        currentContextValue: editContextValue.trim() || null,
      });

      if (res.ok && res.data.hasSuggestion && res.data.contextKind && res.data.contextValue) {
        setEditContextKind(res.data.contextKind as ContextKindOption);
        setEditContextValue(res.data.contextValue);
        if (res.data.category && !editCategory) {
          setEditCategory(res.data.category);
        }
        setEditFormAiNotice(
          `✨ Auto-detected: ${res.data.contextKind}:${res.data.contextValue} — ${res.data.reasoning}${res.data.activatesPlaybook ? ` (Activates ${res.data.activatesPlaybook})` : ""}`
        );
      } else if (res.ok) {
        setEditFormAiNotice(
          res.data.reasoning || "No canonical context could be detected automatically."
        );
      } else {
        setError(res.error || "Failed to auto-detect context");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error auto-detecting context");
    } finally {
      setIsDetectingContextEdit(false);
    }
  };

  const handleDetectCardSuggestion = async (finding: FindingRecord) => {
    setDetectingCard((prev) => ({ ...prev, [finding.id]: true }));
    try {
      const res = await suggestFindingContextAction(sessionId, {
        title: finding.title,
        evidence: finding.evidence,
        category: finding.category,
        currentContextKind: finding.contextKind,
        currentContextValue: finding.contextValue,
      });

      if (res.ok) {
        setCardSuggestions((prev) => ({ ...prev, [finding.id]: res.data }));
      }
    } catch (err) {
      console.error("Failed to detect card suggestion:", err);
    } finally {
      setDetectingCard((prev) => ({ ...prev, [finding.id]: false }));
    }
  };

  const handleApplyCardSuggestion = (
    findingId: string,
    contextKind: ContextKind,
    contextValue: string,
  ) => {
    startTransition(async () => {
      const res = await applyFindingContextSuggestionAction(
        sessionId,
        findingId,
        contextKind,
        contextValue,
        "confirmed",
      );
      if (!res.ok) {
        setError(res.error);
      } else {
        setCardSuggestions((prev) => {
          const next = { ...prev };
          delete next[findingId];
          return next;
        });
      }
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

      {error && !showAddForm && !editingFinding && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center justify-between">
          <span>{error}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="h-5 w-5 p-0 text-destructive hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </Button>
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

              {/* Context Header with AI Auto-Detect */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Target Context (Methodology Anchor)</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoDetectAdd}
                    disabled={isDetectingContextAdd || isPending}
                    className="h-6 gap-1.5 text-[11px] font-mono text-primary border-primary/40 bg-primary/5 hover:bg-primary/15 transition-colors"
                  >
                    {isDetectingContextAdd ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>AI Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        <span>AI Auto-Detect</span>
                      </>
                    )}
                  </Button>
                </div>

                {addFormAiNotice && (
                  <div className="rounded border border-primary/30 bg-primary/10 p-2.5 text-xs text-primary flex items-start justify-between gap-2">
                    <div className="flex items-start gap-1.5 flex-1">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                      <span className="leading-relaxed">{addFormAiNotice}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddFormAiNotice(null)}
                      className="text-primary/70 hover:text-primary shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
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

              {/* Smart Chips Context */}
              <div className="space-y-1.5 pt-0.5">
                <span className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>Smart Context Chips (1-Click Fill):</span>
                </span>
                <div className="flex flex-wrap gap-1">
                  {CONTEXT_CHIPS.map((chip) => {
                    const isSelected =
                      contextKind === chip.kind &&
                      contextValue.toLowerCase() === chip.value.toLowerCase();
                    return (
                      <button
                        key={`${chip.kind}-${chip.value}`}
                        type="button"
                        onClick={() => {
                          setContextKind(chip.kind);
                          setContextValue(chip.value);
                          if (!category) setCategory(chip.kind);
                        }}
                        className={cn(
                          "rounded px-2 py-0.5 text-[11px] font-mono border transition-colors",
                          isSelected
                            ? "border-primary bg-primary/20 text-primary font-semibold"
                            : "border-border bg-background/60 text-muted-foreground hover:bg-card hover:text-foreground",
                        )}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
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

                      {/* Context Header with AI Auto-Detect */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">Target Context (Methodology Anchor)</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAutoDetectEdit}
                            disabled={isDetectingContextEdit || isPending}
                            className="h-6 gap-1.5 text-[11px] font-mono text-primary border-primary/40 bg-primary/5 hover:bg-primary/15 transition-colors"
                          >
                            {isDetectingContextEdit ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>AI Analyzing...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3" />
                                <span>AI Auto-Detect</span>
                              </>
                            )}
                          </Button>
                        </div>

                        {editFormAiNotice && (
                          <div className="rounded border border-primary/30 bg-primary/10 p-2.5 text-xs text-primary flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1.5 flex-1">
                              <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                              <span className="leading-relaxed">{editFormAiNotice}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditFormAiNotice(null)}
                              className="text-primary/70 hover:text-primary shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
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

                      {/* Smart Chips Context */}
                      <div className="space-y-1.5 pt-0.5">
                        <span className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-primary" />
                          <span>Smart Context Chips:</span>
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {CONTEXT_CHIPS.map((chip) => {
                            const isSelected =
                              editContextKind === chip.kind &&
                              editContextValue.toLowerCase() === chip.value.toLowerCase();
                            return (
                              <button
                                key={`edit-${chip.kind}-${chip.value}`}
                                type="button"
                                onClick={() => {
                                  setEditContextKind(chip.kind);
                                  setEditContextValue(chip.value);
                                  if (!editCategory) setEditCategory(chip.kind);
                                }}
                                className={cn(
                                  "rounded px-2 py-0.5 text-[11px] font-mono border transition-colors",
                                  isSelected
                                    ? "border-primary bg-primary/20 text-primary font-semibold"
                                    : "border-border bg-background/60 text-muted-foreground hover:bg-card hover:text-foreground",
                                )}
                              >
                                {chip.label}
                              </button>
                            );
                          })}
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
                            {canonicalKeys.length > 0 ? (
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                → {canonicalKeys.join(", ")}
                              </span>
                            ) : (
                              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400 border border-amber-500/20">
                                (Non-canonical context)
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      {/* Smart AI Context Recommendation on Unnormalized Finding Cards */}
                      {(() => {
                        const canonicalKeys = finding.contextKind && finding.contextValue
                          ? normalizeContext(finding.contextKind as ContextKind, finding.contextValue)
                          : [];
                        const isUnnormalized = canonicalKeys.length === 0;
                        const suggestion = cardSuggestions[finding.id];
                        const isDismissed = dismissedSuggestions[finding.id];
                        const isDetecting = detectingCard[finding.id];

                        if (!isUnnormalized || isDismissed || isCompleted) return null;

                        if (!suggestion) {
                          return (
                            <div className="pt-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isDetecting || isPending}
                                onClick={() => handleDetectCardSuggestion(finding)}
                                className="h-6 gap-1.5 text-[11px] font-mono border-primary/40 bg-primary/5 text-primary hover:bg-primary/15 transition-colors"
                              >
                                {isDetecting ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>AI Analyzing Evidence...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-3 w-3" />
                                    <span>AI Suggest Canonical Context</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          );
                        }

                        if (suggestion.hasSuggestion && suggestion.contextKind && suggestion.contextValue) {
                          return (
                            <div className="mt-2.5 rounded-md border border-primary/40 bg-primary/5 p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  <span>AI Context Recommendation:</span>
                                  <Badge variant="outline" className="font-mono text-[10px] border-primary/50 text-primary bg-primary/10">
                                    {suggestion.contextKind}:{suggestion.contextValue}
                                  </Badge>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setDismissedSuggestions((prev) => ({ ...prev, [finding.id]: true }))}
                                  className="text-muted-foreground hover:text-foreground"
                                  title="Dismiss recommendation"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {suggestion.reasoning}
                              </p>
                              {suggestion.activatesPlaybook && (
                                <p className="text-[11px] font-mono text-emerald-400 font-medium">
                                  👉 Activates Playbook: {suggestion.activatesPlaybook}
                                </p>
                              )}
                              <div className="flex items-center gap-2 pt-0.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isPending}
                                  onClick={() =>
                                    handleApplyCardSuggestion(
                                      finding.id,
                                      suggestion.contextKind as ContextKind,
                                      suggestion.contextValue!,
                                    )
                                  }
                                  className="h-6 gap-1 text-[11px]"
                                >
                                  <Check className="h-3 w-3" />
                                  Apply & Activate Playbook
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDismissedSuggestions((prev) => ({ ...prev, [finding.id]: true }))}
                                  className="h-6 text-[11px] text-muted-foreground"
                                >
                                  Dismiss
                                </Button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="pt-1 flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                            <span>No matching canonical playbook for this evidence.</span>
                            <button
                              type="button"
                              onClick={() => setDismissedSuggestions((prev) => ({ ...prev, [finding.id]: true }))}
                              className="text-xs hover:text-foreground underline underline-offset-2"
                            >
                              Dismiss
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                      {!isCompleted && onFormulateHypothesis && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onFormulateHypothesis(finding.id, finding.title)}
                          className="gap-1.5 text-xs border-border/80 bg-background/50 text-foreground hover:border-primary/60 hover:text-primary transition-colors"
                          title="Formulate attack hypothesis based on this finding"
                        >
                          <Lightbulb className="h-3.5 w-3.5 text-primary" />
                          <span>+ Formulate Hypothesis</span>
                        </Button>
                      )}
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
                      {!isCompleted && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => setFindingToDelete(finding)}
                          className="gap-1 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete finding"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
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

      <ConfirmationDialog
        isOpen={Boolean(findingToDelete)}
        title={findingToDelete ? `Delete Finding: "${findingToDelete.title}"?` : "Delete Finding?"}
        description="Any methodology playbook activated solely by this finding will be superseded, and linked hypotheses will have their finding reference cleared. Are you sure you want to delete this finding?"
        confirmLabel="Delete Finding"
        isDestructive
        isLoading={isPending}
        onConfirm={handleConfirmDeleteFinding}
        onCancel={() => setFindingToDelete(null)}
      />
    </div>
  );
}
