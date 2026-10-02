"use client";

import { useState, useTransition } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NoteRecord } from "@/modules/training/types";
import { createNoteAction, deleteNoteAction } from "@/app/training/[sessionId]/actions";

interface NotesPanelProps {
  readonly sessionId: string;
  readonly notes: readonly NoteRecord[];
}

export function NotesPanel({ sessionId, notes }: NotesPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [showAddNote, setShowAddNote] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await createNoteAction(sessionId, {
        title: title.trim() || null,
        body: body.trim(),
      });

      if (!res.ok) {
        setError(res.error);
      } else {
        setTitle("");
        setBody("");
        setShowAddNote(false);
      }
    });
  };

  const handleDelete = (noteId: string) => {
    startTransition(async () => {
      await deleteNoteAction(sessionId, noteId);
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Session Scratchpad & Notes ({notes.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Record freeform operational observations, raw snippets, and reminders.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => setShowAddNote(!showAddNote)}
          className="gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Note
        </Button>
      </div>

      {showAddNote && (
        <Card className="border-primary/40 bg-card">
          <CardHeader className="py-3.5 px-4 sm:px-5 border-b border-border/60">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-primary">
              New Scratchpad Note
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-xs text-destructive">{error}</p>}

              <div>
                <label htmlFor="n-title" className="block text-xs font-medium text-foreground">
                  Title (Optional)
                </label>
                <input
                  id="n-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Credentials found in /etc/passwd"
                  className="mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label htmlFor="n-body" className="block text-xs font-medium text-foreground">
                  Body *
                </label>
                <textarea
                  id="n-body"
                  required
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write scratchpad notes or paste payloads..."
                  className="mt-1 w-full rounded border border-border bg-background p-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddNote(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="text-xs">
                  Save Note
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {notes.length === 0 ? (
        <Card className="border-dashed text-center">
          <CardContent className="py-12">
            <p className="text-sm text-muted-foreground">
              No scratchpad notes recorded yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {notes.map((note) => (
            <Card key={note.id} className="border-border/80 bg-card/60 flex flex-col justify-between">
              <CardHeader className="py-3 px-4 border-b border-border/40 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    {note.title ?? "Untitled Note"}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(note.id)}
                  disabled={isPending}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  aria-label="Delete note"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent className="p-4 flex-1">
                <pre className="whitespace-pre-wrap font-mono text-xs text-foreground/90">
                  {note.body}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
