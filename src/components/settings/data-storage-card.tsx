"use client";

import { useState } from "react";
import {
  Archive,
  Database,
  Download,
  HardDrive,
  History,
  Loader2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  clearCacheAction,
  clearHistoryAction,
  exportSessionsAction,
} from "@/modules/settings/actions";
import type { StorageSettings } from "@/modules/settings/types";
import { ConfirmationDialog } from "./confirmation-dialog";

interface DataStorageCardProps {
  readonly initialStorage: StorageSettings;
}

export function DataStorageCard({ initialStorage }: DataStorageCardProps) {
  const [storage, setStorage] = useState(initialStorage);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    action: async () => {},
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportSessionsAction();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2),
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute(
        "download",
        `ctf-trainer-sessions-backup-${new Date().toISOString().slice(0, 10)}.json`,
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } finally {
      setIsExporting(false);
    }
  };

  const openClearHistoryModal = () => {
    setConfirmModal({
      isOpen: true,
      title: "Clear Generation History?",
      description:
        "This will permanently delete all stored AI generation runs and mentor interaction logs. Your confirmed findings, hypotheses, and sessions will remain safe.",
      action: async () => {
        setIsClearingHistory(true);
        try {
          const result = await clearHistoryAction();
          if (result.ok) {
            setStorage((prev) => ({
              ...prev,
              totalGenerationRuns: 0,
            }));
          }
        } finally {
          setIsClearingHistory(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const openClearCacheModal = () => {
    setConfirmModal({
      isOpen: true,
      title: "Clear Application Cache?",
      description:
        "This will purge temporary memory caches and reset local session snapshots. Ongoing active sessions will retain their saved database records.",
      action: async () => {
        setIsClearingCache(true);
        try {
          const result = await clearCacheAction();
          if (result.ok) {
            setStorage((prev) => ({
              ...prev,
              estimatedCacheMb: 0,
            }));
          }
        } finally {
          setIsClearingCache(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  return (
    <>
      <Card className="p-6 border-border bg-card space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-emerald-400" />
            <h3 className="font-mono text-sm font-bold text-foreground">
              Data & Storage
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage your training records, JSON backup exports, and local database storage.
          </p>
        </div>

        <div className="space-y-4 divide-y divide-border/60">
          {/* Row 1: Database Status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-mono text-xs font-semibold text-foreground">
                  Database Status
                </span>
                <span
                  className={`flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full border ${
                    storage.isDbConnected
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      storage.isDbConnected ? "bg-emerald-400" : "bg-rose-400"
                    }`}
                  />
                  {storage.isDbConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Your training data is automatically saved to local PostgreSQL.
              </p>
              <div className="flex items-center gap-2 pt-0.5 font-mono text-[10px] text-muted-foreground">
                <span>{storage.totalSessions} sessions</span>
                <span>•</span>
                <span>{storage.totalFindings} findings</span>
              </div>
            </div>
          </div>

          {/* Row 2: Export Training Sessions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Archive className="h-3.5 w-3.5 text-foreground/70" />
                <span className="font-mono text-xs font-semibold text-foreground">
                  Export Training Sessions
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Download your complete training history, findings, and reviews as JSON.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={handleExport}
              className="font-mono text-xs shrink-0 hover:border-emerald-500/50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                  Export Sessions
                </>
              )}
            </Button>
          </div>

          {/* Row 3: Generation History */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <History className="h-3.5 w-3.5 text-foreground/70" />
                <span className="font-mono text-xs font-semibold text-foreground">
                  Generation History
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-muted-foreground"
                >
                  {storage.totalGenerationRuns} runs
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Stored prompt traces, writeup parsing runs, and mentor hint records.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isClearingHistory || storage.totalGenerationRuns === 0}
              onClick={openClearHistoryModal}
              className="font-mono text-xs shrink-0 text-muted-foreground hover:text-rose-400 hover:border-rose-500/40"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Clear History
            </Button>
          </div>

          {/* Row 4: Application Cache */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <HardDrive className="h-3.5 w-3.5 text-foreground/70" />
                <span className="font-mono text-xs font-semibold text-foreground">
                  Application Cache
                </span>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] text-muted-foreground"
                >
                  {storage.estimatedCacheMb} MB
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Purge locally cached verification state and transient scratch files.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isClearingCache}
              onClick={openClearCacheModal}
              className="font-mono text-xs shrink-0 text-muted-foreground hover:text-rose-400 hover:border-rose-500/40"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Clear Cache
            </Button>
          </div>
        </div>
      </Card>

      {/* Destructive Confirmation Modal */}
      <ConfirmationDialog
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmLabel="Confirm & Clear"
        isDestructive={true}
        isLoading={isClearingHistory || isClearingCache}
        onConfirm={confirmModal.action}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
