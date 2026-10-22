"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Copy,
  Flag,
  Send,
  Shield,
  Swords,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { submitDirectFlagAction } from "@/app/training/[sessionId]/actions";

interface AdventureModePanelProps {
  readonly sessionId: string;
  readonly targetIp?: string | null;
  readonly userFlagSubmitted?: string | null;
  readonly userFlagSubmittedAt?: Date | null;
  readonly rootFlagSubmitted?: string | null;
  readonly rootFlagSubmittedAt?: Date | null;
  readonly isCompleted?: boolean;
}

export function AdventureModePanel({
  sessionId,
  targetIp,
  userFlagSubmitted,
  userFlagSubmittedAt,
  rootFlagSubmitted,
  rootFlagSubmittedAt,
  isCompleted = false,
}: AdventureModePanelProps) {
  const [userFlagInput, setUserFlagInput] = useState("");
  const [rootFlagInput, setRootFlagInput] = useState("");
  const [userFlagError, setUserFlagError] = useState<string | null>(null);
  const [rootFlagError, setRootFlagError] = useState<string | null>(null);
  const [userFlagSuccess, setUserFlagSuccess] = useState<string | null>(null);
  const [rootFlagSuccess, setRootFlagSuccess] = useState<string | null>(null);
  const [isCopiedIp, setIsCopiedIp] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCopyIp = () => {
    if (!targetIp) return;
    navigator.clipboard.writeText(targetIp);
    setIsCopiedIp(true);
    setTimeout(() => setIsCopiedIp(false), 2000);
  };

  const handleUserFlagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const flag = userFlagInput.trim();
    if (!flag) return;

    setUserFlagError(null);
    setUserFlagSuccess(null);

    startTransition(async () => {
      const res = await submitDirectFlagAction(sessionId, "user_flag", flag);
      if (!res.ok) {
        setUserFlagError(res.error || "Invalid user flag");
      } else {
        setUserFlagSuccess(res.message || "User flag captured!");
        setUserFlagInput("");
      }
    });
  };

  const handleRootFlagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const flag = rootFlagInput.trim();
    if (!flag) return;

    setRootFlagError(null);
    setRootFlagSuccess(null);

    startTransition(async () => {
      const res = await submitDirectFlagAction(sessionId, "root_flag", flag);
      if (!res.ok) {
        setRootFlagError(res.error || "Invalid root flag");
      } else {
        setRootFlagSuccess(res.message || "Root flag captured!");
        setRootFlagInput("");
      }
    });
  };

  const isUserCaptured = Boolean(userFlagSubmitted);
  const isRootCaptured = Boolean(rootFlagSubmitted);

  return (
    <div className="space-y-6 p-4 sm:p-6 w-full">
      {/* Banner Notice */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-950/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-amber-500/40 bg-amber-500/20 text-amber-400 shrink-0">
            <Swords className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>Adventure Mode</span>
              <Badge variant="outline" className="border-amber-500/40 text-amber-400 font-mono text-[10px]">
                Black-Box Assessment
              </Badge>
            </h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              No milestone questions or guided prompts. Attack the target manually, record your findings and hypotheses in the workspace below, and submit the flags when captured.
            </p>
          </div>
        </div>

        {/* Target IP Pill */}
        {targetIp && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 shrink-0">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-mono text-xs text-muted-foreground">Target:</span>
            <span className="font-mono text-xs font-semibold text-foreground">{targetIp}</span>
            <button
              type="button"
              onClick={handleCopyIp}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              title="Copy IP"
            >
              <Copy className="h-3 w-3" />
            </button>
            {isCopiedIp && <span className="text-[10px] text-primary font-mono">Copied</span>}
          </div>
        )}
      </div>

      {/* Flag Capture Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User Flag Card */}
        <div
          className={cn(
            "rounded-lg border p-5 flex flex-col justify-between transition-all",
            isUserCaptured
              ? "border-emerald-500/30 bg-emerald-950/10 shadow-xs"
              : "border-border bg-card",
          )}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">User Flag</h3>
              </div>
              {isUserCaptured ? (
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 gap-1 text-[11px] font-mono">
                  <CheckCircle2 className="h-3 w-3" />
                  Captured
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[11px] font-mono">
                  Pending Foothold
                </Badge>
              )}
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Standard user compromise flag (typically located at <code className="text-foreground">/home/*/user.txt</code>).
            </p>
          </div>

          <div className="mt-5">
            {isUserCaptured ? (
              <div className="flex flex-col gap-1 font-mono text-xs bg-emerald-950/20 border border-emerald-500/20 p-3 rounded">
                <span className="text-muted-foreground text-[11px]">Submitted Value:</span>
                <span className="text-emerald-400 font-semibold break-all">{userFlagSubmitted}</span>
                {userFlagSubmittedAt && (
                  <span className="text-muted-foreground/70 text-[10px] mt-1">
                    Captured at: {new Date(userFlagSubmittedAt).toLocaleString()}
                  </span>
                )}
              </div>
            ) : !isCompleted ? (
              <form onSubmit={handleUserFlagSubmit} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={userFlagInput}
                    onChange={(e) => {
                      setUserFlagInput(e.target.value);
                      if (userFlagError) setUserFlagError(null);
                    }}
                    placeholder="e.g. HTB{...}"
                    disabled={isPending}
                    className="font-mono text-xs h-9 bg-background focus:ring-1 focus:ring-primary"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending || !userFlagInput.trim()}
                    className="h-9 px-4 font-mono text-xs gap-1.5 shrink-0"
                  >
                    <Send className="h-3 w-3" />
                    <span>Submit</span>
                  </Button>
                </div>
                {userFlagError && (
                  <span className="text-xs text-destructive">{userFlagError}</span>
                )}
                {userFlagSuccess && (
                  <span className="text-xs text-emerald-400">{userFlagSuccess}</span>
                )}
              </form>
            ) : null}
          </div>
        </div>

        {/* Root Flag Card */}
        <div
          className={cn(
            "rounded-lg border p-5 flex flex-col justify-between transition-all",
            isRootCaptured
              ? "border-emerald-500/30 bg-emerald-950/10 shadow-xs"
              : "border-border bg-card",
          )}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-400" />
                <h3 className="font-semibold text-sm text-foreground">Root Flag</h3>
              </div>
              {isRootCaptured ? (
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 gap-1 text-[11px] font-mono">
                  <CheckCircle2 className="h-3 w-3" />
                  Captured
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[11px] font-mono">
                  Pending PrivEsc
                </Badge>
              )}
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              Administrative compromise flag (typically located at <code className="text-foreground">/root/root.txt</code> or SYSTEM).
            </p>
          </div>

          <div className="mt-5">
            {isRootCaptured ? (
              <div className="flex flex-col gap-1 font-mono text-xs bg-emerald-950/20 border border-emerald-500/20 p-3 rounded">
                <span className="text-muted-foreground text-[11px]">Submitted Value:</span>
                <span className="text-emerald-400 font-semibold break-all">{rootFlagSubmitted}</span>
                {rootFlagSubmittedAt && (
                  <span className="text-muted-foreground/70 text-[10px] mt-1">
                    Captured at: {new Date(rootFlagSubmittedAt).toLocaleString()}
                  </span>
                )}
              </div>
            ) : !isCompleted ? (
              <form onSubmit={handleRootFlagSubmit} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={rootFlagInput}
                    onChange={(e) => {
                      setRootFlagInput(e.target.value);
                      if (rootFlagError) setRootFlagError(null);
                    }}
                    placeholder="e.g. HTB{...}"
                    disabled={isPending}
                    className="font-mono text-xs h-9 bg-background focus:ring-1 focus:ring-primary"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending || !rootFlagInput.trim()}
                    className="h-9 px-4 font-mono text-xs gap-1.5 shrink-0"
                  >
                    <Send className="h-3 w-3" />
                    <span>Submit</span>
                  </Button>
                </div>
                {rootFlagError && (
                  <span className="text-xs text-destructive">{rootFlagError}</span>
                )}
                {rootFlagSuccess && (
                  <span className="text-xs text-emerald-400">{rootFlagSuccess}</span>
                )}
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
