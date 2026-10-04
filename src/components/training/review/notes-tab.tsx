import { Clock, FileText, Flag, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { SessionReviewData } from "@/modules/review/types";

interface NotesTabProps {
  readonly review: SessionReviewData;
}

export function NotesTab({ review }: NotesTabProps) {
  const { notes, findings } = review;

  const objectiveFinding = findings.find(
    (f) =>
      f.category.toLowerCase().includes("objective") ||
      f.category.toLowerCase().includes("flag"),
  );

  return (
    <div className="space-y-6">
      {/* 1. Final Objective Capture & Completion Reflection */}
      {objectiveFinding && (
        <Card className="p-5 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Flag className="h-4 w-4 text-emerald-400" />
              Objective Completion Proof & Reflections
            </h4>
            <Badge
              variant="outline"
              className="border-emerald-500/40 text-emerald-400 font-mono text-[10px]"
            >
              CONFIRMED OBJECTIVE
            </Badge>
          </div>

          <div className="rounded border border-border bg-card p-3 font-mono text-xs text-foreground mb-3 overflow-x-auto">
            <span className="text-muted-foreground select-none">Capture Proof: </span>
            {objectiveFinding.evidence || "No raw string recorded"}
          </div>

          {objectiveFinding.notes && (
            <div>
              <span className="font-mono text-[11px] text-muted-foreground block mb-1">
                Learner Reflections / Notes:
              </span>
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                {objectiveFinding.notes}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* 2. Session Notes */}
      <div>
        <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Recorded Session Notes ({notes.length})
        </h4>

        {notes.length === 0 ? (
          <Card className="p-8 text-center border-border bg-card">
            <StickyNote className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <h5 className="text-sm font-semibold text-foreground">No Session Notes Recorded</h5>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              You did not record freeform notes during this session.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <Card key={note.id} className="p-4 border-border bg-card">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h5 className="text-sm font-semibold text-foreground">
                    {note.title || "Untitled Note"}
                  </h5>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {new Date(note.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {note.body}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
