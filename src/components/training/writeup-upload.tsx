"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { ArrowRight, ChevronDown, FileText, Upload, X } from "lucide-react";
import { GenerationPreview } from "@/components/training/generation-preview";
import type { GenerationPreviewState } from "@/components/training/generation-preview-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const maxWriteupBytes = 10_000_000;
type SelectedWriteup = Pick<File, "name" | "size">;

// Metadata checks support this local UI only; server validation belongs to the upload stage.
function validateSelection(files: FileList): string | null {
  if (files.length !== 1) return "Choose one writeup at a time.";
  const file = files[0];
  if (!/\.(pdf|txt|md)$/i.test(file.name)) return "Unsupported format. Choose a PDF, TXT, or Markdown (.md) file.";
  if (file.size === 0) return "This file is empty. Choose a writeup with content.";
  if (file.size > maxWriteupBytes) return "This file exceeds 10 MB. Choose a smaller writeup.";
  return null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1_000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${(bytes / 1_000_000).toFixed(2)} MB`;
}

export function WriteupUpload({ children }: { children: ReactNode }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const browseRef = useRef<HTMLButtonElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedWriteup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GenerationPreviewState | null>(null);

  function selectFiles(files: FileList) {
    const validationError = validateSelection(files);
    setError(validationError);
    setPreview(null);
    // Retain metadata only. No file contents are read, sent, or persisted.
    setSelectedFile(validationError ? null : { name: files[0].name, size: files[0].size });
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile() {
    setSelectedFile(null);
    setError(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
    browseRef.current?.focus();
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    selectFiles(event.dataTransfer.files);
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <Card role="region" aria-labelledby="upload-writeup-title" className="min-w-0">
        <CardHeader className="border-b border-border">
          <h2 id="upload-writeup-title" className="text-base font-medium">Upload Writeup</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Choose the writeup for your next practice session.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => {
            event.preventDefault();
            if (selectedFile) setPreview("processing");
          }} className="space-y-5">
            <div>
              <input ref={inputRef} type="file" accept=".pdf,.txt,.md" aria-label="Choose writeup file" className="hidden"
                onChange={(event) => {
                  if (event.target.files?.length) selectFiles(event.target.files);
                }}
              />
              <button ref={browseRef} type="button" onClick={() => inputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  dragDepth.current += 1;
                  setIsDragging(true);
                }}
                onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  dragDepth.current = Math.max(0, dragDepth.current - 1);
                  if (dragDepth.current === 0) setIsDragging(false);
                }}
                onDrop={handleDrop}
                aria-label={selectedFile ? "Replace writeup file" : "Browse writeup files"}
                aria-describedby={error ? "writeup-formats writeup-error" : "writeup-formats"}
                className={cn("flex min-h-48 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-input bg-background/30 px-5 py-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none", isDragging && "border-primary bg-primary/10", error && "border-destructive/60")}
              >
                <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/40 text-primary">
                  <Upload aria-hidden="true" className="size-5" strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block text-sm font-medium">{isDragging ? "Drop your writeup here" : "Drag and drop your writeup here"}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">or <span className="text-primary">click to browse</span></span>
                </span>
                <span id="writeup-formats" className="text-xs leading-5 text-muted-foreground">
                  Supports PDF, TXT, and Markdown (.md) files<br />Max file size: <span className="font-mono">10 MB</span>
                </span>
              </button>

              {error && <p id="writeup-error" role="alert" className="mt-2 text-xs leading-5 text-destructive">{error}</p>}
              <div aria-live="polite">
                {selectedFile && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-background/30 p-3">
                    <FileText aria-hidden="true" className="size-5 shrink-0 text-primary" strokeWidth={1.75} />
                    <div className="min-w-0 flex-1">
                      <p className="break-all text-sm font-medium">{selectedFile.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={removeFile} aria-label="Remove selected file">
                      <X aria-hidden="true" strokeWidth={1.75} />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="training-framework" className="block text-sm font-medium">Methodology Framework</label>
              <div className="relative">
                <select id="training-framework" name="framework" defaultValue="ptes" aria-describedby="framework-description"
                  className="h-10 w-full appearance-none rounded-lg border border-input bg-background/40 py-2 pl-3 pr-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="ptes">PTES — CTF Adapted</option>
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <p id="framework-description" className="text-xs leading-5 text-muted-foreground">
                Structure the training session using the PTES methodology, adapted for capture-the-flag scenarios.
              </p>
            </div>

            <div className="border-t border-border pt-4">
              <Button type="submit" size="lg" disabled={!selectedFile} aria-describedby="generation-preview-notice" className="w-full">
                Generate Training<ArrowRight aria-hidden="true" strokeWidth={1.75} />
              </Button>
              <p id="generation-preview-notice" className="mt-2 text-xs leading-5 text-muted-foreground">
                UI preview only. Generate Training opens sample processing states. Files are not uploaded and no training session is created.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {children}

      {preview && <GenerationPreview state={preview} onChange={setPreview} onReplaceFile={() => { removeFile(); inputRef.current?.click(); }} />}
    </div>
  );
}
