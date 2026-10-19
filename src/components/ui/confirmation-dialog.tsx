"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface ConfirmationDialogProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly isDestructive?: boolean;
  readonly isLoading?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmationDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onCancel();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in-0"
    >
      <Card className="w-full max-w-md border-border bg-card p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-bold text-foreground">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Action confirmation required
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/80">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={onCancel}
            className="font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            size="sm"
            disabled={isLoading}
            onClick={onConfirm}
            className="font-mono text-xs"
          >
            {isLoading ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
