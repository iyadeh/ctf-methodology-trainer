"use client";

import { useState } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Loader2,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  fetchAvailableModelsAction,
  resetApiKeyAction,
  saveAiModelAction,
  saveApiKeyAction,
  testAiConnectionAction,
} from "@/modules/settings/actions";
import type { AiSettings, GeminiModelInfo } from "@/modules/settings/types";

const INITIAL_FALLBACK_MODELS: GeminiModelInfo[] = [
  {
    id: "gemini-3.5-flash",
    displayName: "Gemini 3.5 Flash",
    description: "Hybrid reasoning, high speed & accuracy (Recommended)",
    isRecommended: true,
  },
  {
    id: "gemini-3.5-flash-lite",
    displayName: "Gemini 3.5 Flash-Lite",
    description: "Ultra-fast & cost-effective for high volume requests",
  },
  {
    id: "gemini-3.1-pro-preview",
    displayName: "Gemini 3.1 Pro Preview",
    description: "Advanced complex multi-step reasoning",
  },
];

interface AiConfigCardProps {
  readonly initialAi: AiSettings;
  readonly initialModels?: GeminiModelInfo[];
}

export function AiConfigCard({ initialAi, initialModels }: AiConfigCardProps) {
  // Normalize deprecated 2.5 model if present in initial state
  const normalizedInitialModel =
    initialAi.model && !initialAi.model.includes("2.5")
      ? initialAi.model
      : "gemini-3.5-flash";

  const [model, setModel] = useState(normalizedInitialModel);
  const [availableModels, setAvailableModels] = useState<GeminiModelInfo[]>(
    initialModels && initialModels.length > 0
      ? initialModels
      : INITIAL_FALLBACK_MODELS,
  );
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isLiveDiscovered, setIsLiveDiscovered] = useState(
    Boolean(initialModels && initialModels.length > 0),
  );

  const [maskedKey, setMaskedKey] = useState(initialAi.maskedKey);
  const [hasCustomKey, setHasCustomKey] = useState(initialAi.hasCustomKey);
  const [isConnected, setIsConnected] = useState(initialAi.isConnected);
  const [latencyMs, setLatencyMs] = useState<number | undefined>(
    initialAi.latencyMs,
  );

  const [inputKey, setInputKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [isResettingKey, setIsResettingKey] = useState(false);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const loadRemoteModels = async (quiet = false) => {
    setIsFetchingModels(true);
    try {
      const models = await fetchAvailableModelsAction();
      if (models && models.length > 0) {
        setAvailableModels(models);
        setIsLiveDiscovered(true);
        if (!quiet) {
          setFeedback({
            type: "info",
            message: `Discovered ${models.length} active models in real-time from Gemini API.`,
          });
        }
      }
    } catch {
      // Gracefully retain fallback models
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setFeedback(null);
    try {
      const result = await testAiConnectionAction(model);
      setIsConnected(result.ok);
      setLatencyMs(result.latencyMs);

      if (result.ok) {
        setFeedback({
          type: "success",
          message: `Successfully connected to Gemini API with "${result.model}" (${result.latencyMs}ms).`,
        });
        // Also refresh models live from API upon successful connection
        void loadRemoteModels(true);
      } else {
        setFeedback({
          type: "error",
          message: result.error || `Connection test failed for "${model}".`,
        });
      }
    } catch {
      setIsConnected(false);
      setFeedback({
        type: "error",
        message: "Failed to reach server to test connection.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleModelChange = async (newModel: string) => {
    setModel(newModel);
    try {
      await saveAiModelAction(newModel);
      setFeedback({
        type: "success",
        message: `Model preference set to ${newModel}.`,
      });
    } catch {
      setFeedback({
        type: "error",
        message: "Failed to persist model preference.",
      });
    }
  };

  const handleSaveModel = async () => {
    setIsSavingModel(true);
    setFeedback(null);
    try {
      await saveAiModelAction(model);
      setFeedback({
        type: "success",
        message: `Model preference successfully saved as "${model}".`,
      });
    } catch {
      setFeedback({
        type: "error",
        message: "Failed to persist model preference.",
      });
    } finally {
      setIsSavingModel(false);
    }
  };

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;

    setIsSavingKey(true);
    setFeedback(null);

    try {
      const result = await saveApiKeyAction(inputKey.trim(), model);
      if (result.ok) {
        setInputKey("");
        if (result.maskedKey) {
          setMaskedKey(result.maskedKey);
        }
        setHasCustomKey(true);
        setIsConnected(true);
        setFeedback({
          type: "success",
          message: result.message,
        });
        // Dynamically fetch models with the newly validated key
        void loadRemoteModels(false);
      } else {
        setFeedback({
          type: "error",
          message: result.message,
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Unexpected error verifying and saving API key.",
      });
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleResetKey = async () => {
    setIsResettingKey(true);
    setFeedback(null);

    try {
      const result = await resetApiKeyAction();
      if (result.ok) {
        setMaskedKey(result.maskedKey);
        setHasCustomKey(false);
        setInputKey("");
        setFeedback({
          type: "info",
          message: result.message,
        });
        void loadRemoteModels(true);
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Failed to reset API key.",
      });
    } finally {
      setIsResettingKey(false);
    }
  };

  return (
    <Card className="p-6 border-border bg-card space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-emerald-400" />
            <h3 className="font-mono text-sm font-bold text-foreground">
              AI Configuration
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure the AI provider used for hints, explanations, and feedback.
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-md border ${
              isConnected
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-rose-500/40 bg-rose-500/10 text-rose-300"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
              }`}
            />
            <span>{isConnected ? "Connected" : "Disconnected"}</span>
            {typeof latencyMs === "number" && isConnected && (
              <span className="text-[10px] text-muted-foreground ml-0.5">
                ({latencyMs}ms)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Selectors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Provider */}
        <div className="space-y-1.5">
          <label className="font-mono text-xs text-muted-foreground">Provider</label>
          <div className="flex h-9 items-center justify-between rounded-md border border-input bg-background/80 px-3 font-mono text-xs text-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              Google Gemini
            </span>
            <span className="text-[10px] text-muted-foreground">Native SDK</span>
          </div>
        </div>

        {/* Model */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-mono text-xs text-muted-foreground">AI Model</label>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground font-mono">
                {isLiveDiscovered ? "Gemini Live API" : "Verified Presets"}
              </span>
              <button
                type="button"
                onClick={() => loadRemoteModels(false)}
                disabled={isFetchingModels || !isConnected}
                className="text-muted-foreground hover:text-emerald-400 transition-colors disabled:opacity-40"
                title="Fetch models in real-time from Gemini API"
              >
                <RefreshCw
                  className={`h-3 w-3 ${isFetchingModels ? "animate-spin text-emerald-400" : ""}`}
                />
              </button>
            </div>
          </div>
          <select
            value={model}
            onChange={(e) => handleModelChange(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {availableModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName} {m.isRecommended ? "(Recommended)" : ""}{" "}
                {m.description ? `— ${m.description}` : ""}
              </option>
            ))}
            {!availableModels.some((m) => m.id === model) && (
              <option value={model}>{model} (Active)</option>
            )}
          </select>
        </div>
      </div>

      {/* Actions: Test Connection & Save Model */}
      <div className="pt-1 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={isTesting}
          onClick={handleTestConnection}
          className="font-mono text-xs text-foreground hover:border-emerald-500/50"
        >
          {isTesting ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-emerald-400" />
              Testing {model}...
            </>
          ) : (
            <>
              <Zap className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
              Test Connection
            </>
          )}
        </Button>

        <Button
          size="sm"
          disabled={isSavingModel}
          onClick={handleSaveModel}
          className="font-mono text-xs"
        >
          {isSavingModel ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Saving Model...
            </>
          ) : (
            "Save Model"
          )}
        </Button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-start gap-2.5 rounded-md border p-3 font-mono text-xs ${
            feedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : feedback.type === "error"
                ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                : "border-sky-500/40 bg-sky-500/10 text-sky-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <span className="leading-snug">{feedback.message}</span>
        </div>
      )}

      {/* API Key Management */}
      <div className="space-y-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
            <Key className="h-3.5 w-3.5 text-emerald-400" />
            <span>Active API Key</span>
          </div>
          <Badge
            variant="outline"
            className="font-mono text-[10px] text-muted-foreground"
          >
            {hasCustomKey ? "Custom Override" : ".env.local"}
          </Badge>
        </div>

        {/* Current Key Masked Display */}
        <div className="flex items-center justify-between rounded-md border border-border/80 bg-background/60 p-2.5 font-mono text-xs">
          <span className="text-foreground/90">{maskedKey}</span>
          {hasCustomKey && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isResettingKey}
              onClick={handleResetKey}
              className="h-6 px-2 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Reset to .env.local
            </Button>
          )}
        </div>

        {/* Custom Key Update Form */}
        <form onSubmit={handleSaveKey} className="space-y-2 pt-1">
          <label className="font-mono text-xs text-muted-foreground">
            Update API Key in UI
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? "text" : "password"}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Paste new Gemini API Key (AIzaSy...)"
                className="h-9 pr-9 font-mono text-xs bg-background"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showKey ? "Hide API Key" : "Show API Key"}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={isSavingKey || !inputKey.trim()}
              className="h-9 font-mono text-xs shrink-0"
            >
              {isSavingKey ? "Verifying..." : "Save Key"}
            </Button>
          </div>
        </form>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          The AI is used to generate hints, explanations, and guided learning content.
          Your API key is stored securely server-side and never exposed in browser logs.
        </p>
      </div>
    </Card>
  );
}
