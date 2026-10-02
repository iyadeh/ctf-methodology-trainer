"use client";

import { useRef, useState, useTransition, type DragEvent, type ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  FileText,
  Hash,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { GenerationPreview } from "@/components/training/generation-preview";
import type { GenerationPreviewState } from "@/components/training/generation-preview-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { uploadWriteupAction } from "@/app/training/new/actions";
import type { WriteupMetadataSummary } from "@/modules/writeups";
import type { ExtractedMachineFacts } from "@/modules/facts";
import { ExtractedFactsView } from "./extracted-facts-view";

const maxWriteupBytes = 10_000_000;

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
  const [isPending, startTransition] = useTransition();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsedMetadata, setParsedMetadata] = useState<WriteupMetadataSummary | null>(null);
  const [extractedFacts, setExtractedFacts] = useState<ExtractedMachineFacts | null>(null);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const [preview, setPreview] = useState<GenerationPreviewState | null>(null);

  function selectFiles(files: FileList) {
    const validationError = validateSelection(files);
    setError(validationError);
    setPreview(null);
    setParsedMetadata(null);
    setExtractedFacts(null);
    setAiWarning(null);
    setSelectedFile(validationError ? null : files[0]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile() {
    setSelectedFile(null);
    setError(null);
    setPreview(null);
    setParsedMetadata(null);
    setExtractedFacts(null);
    setAiWarning(null);
    if (inputRef.current) inputRef.current.value = "";
    browseRef.current?.focus();
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    selectFiles(event.dataTransfer.files);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedFile) return;

    setError(null);
    setAiWarning(null);
    setPreview("processing");

    startTransition(async () => {
      const formData = new FormData();
      formData.append("writeup", selectedFile);

      const result = await uploadWriteupAction(formData);

      if (!result.ok) {
        setError(result.error);
        setPreview("failed");
      } else {
        setParsedMetadata(result.metadata);
        setExtractedFacts(result.facts || null);
        setAiWarning(result.aiWarning || null);
        setPreview("ready");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <Card role="region" aria-labelledby="upload-writeup-title" className="min-w-0">
        <CardHeader className="border-b border-border">
          <h2 id="upload-writeup-title" className="text-base font-medium">Upload Writeup</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Choose the writeup for your next practice session. Supports PDF, TXT, and Markdown.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.txt,.md"
                aria-label="Choose writeup file"
                className="hidden"
                onChange={(event) => {
                  if (event.target.files?.length) selectFiles(event.target.files);
                }}
              />
              <button
                ref={browseRef}
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  dragDepth.current += 1;
                  setIsDragging(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  dragDepth.current = Math.max(0, dragDepth.current - 1);
                  if (dragDepth.current === 0) setIsDragging(false);
                }}
                onDrop={handleDrop}
                aria-label={selectedFile ? "Replace writeup file" : "Browse writeup files"}
                aria-describedby={error ? "writeup-formats writeup-error" : "writeup-formats"}
                className={cn(
                  "flex min-h-48 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-input bg-background/30 px-5 py-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                  isDragging && "border-primary bg-primary/10",
                  error && "border-destructive/60",
                )}
              >
                <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/40 text-primary">
                  <Upload aria-hidden="true" className="size-5" strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block text-sm font-medium">
                    {isDragging ? "Drop your writeup here" : "Drag and drop your writeup here"}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    or <span className="text-primary">click to browse</span>
                  </span>
                </span>
                <span id="writeup-formats" className="text-xs leading-5 text-muted-foreground">
                  Supports PDF, TXT, and Markdown (.md) files<br />Max file size: <span className="font-mono">10 MB</span>
                </span>
              </button>

              {error && (
                <p id="writeup-error" role="alert" className="mt-2 text-xs leading-5 text-destructive">
                  {error}
                </p>
              )}

              <div aria-live="polite">
                {selectedFile && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-background/30 p-3">
                    <FileText aria-hidden="true" className="size-5 shrink-0 text-primary" strokeWidth={1.75} />
                    <div className="min-w-0 flex-1">
                      <p className="break-all text-sm font-medium">{selectedFile.name}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={removeFile}
                      aria-label="Remove selected file"
                    >
                      <X aria-hidden="true" strokeWidth={1.75} />
                    </Button>
                  </div>
                )}
              </div>

              {parsedMetadata && (
                <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3.5 text-xs">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <FileCheck2 className="size-4 text-primary" />
                    <span>Writeup Parsed & Normalized</span>
                    <Badge variant="outline" className="ml-auto font-mono text-[10px] uppercase text-primary border-primary/30">
                      {parsedMetadata.format}
                    </Badge>
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-muted-foreground sm:grid-cols-3">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground/80">Words</span>
                      <span className="font-mono font-semibold text-foreground">{parsedMetadata.wordCount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground/80">Characters</span>
                      <span className="font-mono font-semibold text-foreground">{parsedMetadata.characterCount.toLocaleString()}</span>
                    </div>
                    {parsedMetadata.pageCount !== undefined && (
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground/80">Pages</span>
                        <span className="font-mono font-semibold text-foreground">{parsedMetadata.pageCount}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2.5 border-t border-border/40 pt-2">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Hash className="size-3 text-muted-foreground" /> SHA-256 Fingerprint:
                    </span>
                    <p className="mt-0.5 break-all font-mono text-[10px] text-foreground/80">
                      {parsedMetadata.sha256Hash}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="training-framework" className="block text-sm font-medium">
                Methodology Framework
              </label>
              <div className="relative">
                <select
                  id="training-framework"
                  name="framework"
                  defaultValue="ptes"
                  aria-describedby="framework-description"
                  className="h-10 w-full appearance-none rounded-lg border border-input bg-background/40 py-2 pl-3 pr-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="ptes">PTES — CTF Adapted</option>
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  strokeWidth={1.75}
                />
              </div>
              <p id="framework-description" className="text-xs leading-5 text-muted-foreground">
                Structure the training session using the PTES methodology, adapted for capture-the-flag scenarios.
              </p>
            </div>

            <div className="border-t border-border pt-4">
              <Button
                type="submit"
                size="lg"
                disabled={!selectedFile || isPending}
                aria-describedby="generation-preview-notice"
                className="w-full"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Extracting Facts with Gemini AI...
                  </>
                ) : (
                  <>
                    Parse & Extract Machine Facts
                    <ArrowRight aria-hidden="true" strokeWidth={1.75} />
                  </>
                )}
              </Button>
              <div id="generation-preview-notice" className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                {parsedMetadata ? (
                  <p className="text-primary flex items-center gap-1">
                    <CheckCircle2 className="size-3.5 inline" />
                    Document parsed and normalized.
                  </p>
                ) : (
                  <p>Upload a writeup to extract normalized text and generate structured machine facts.</p>
                )}
                {aiWarning && (
                  <p className="text-amber-400 font-mono text-[11px]">
                    Warning: {aiWarning}
                  </p>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {children}

      {extractedFacts && (
        <div className="xl:col-span-2">
          <ExtractedFactsView facts={extractedFacts} />
        </div>
      )}

      {preview && !extractedFacts && (
        <GenerationPreview
          state={preview}
          onChange={setPreview}
          onReplaceFile={() => {
            removeFile();
            inputRef.current?.click();
          }}
        />
      )}
    </div>
  );
}
