import { createHash } from "node:crypto";
import type { MilestoneTaskType } from "./types";

export interface VerifyMilestoneOptions {
  readonly userAnswer: string;
  readonly expectedAnswer?: string | null;
  readonly answerHash?: string | null;
  readonly formatHint?: string | null;
  readonly taskType?: MilestoneTaskType;
}

export interface VerifyMilestoneResult {
  readonly isCorrect: boolean;
  readonly normalizedUserAnswer: string;
  readonly feedback?: string;
}

/**
 * Normalizes input strings by trimming, lowercasing, stripping surrounding quotes,
 * and normalizing comma-separated lists (e.g. port lists).
 */
export function normalizeAnswer(input: string): string {
  if (!input) return "";

  // 1. Trim whitespace and control characters
  let val = input.trim();

  // 2. Strip surrounding single, double, or backtick quotes
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'")) ||
    (val.startsWith("`") && val.endsWith("`"))
  ) {
    val = val.slice(1, -1).trim();
  }

  // 3. Lowercase
  val = val.toLowerCase();

  // 4. Strip leading './'
  if (val.startsWith("./")) {
    val = val.slice(2).trim();
  }

  // 5. If comma-separated tokens (e.g. "80, 22" or "22,80"), sort tokens so order doesn't matter
  if (val.includes(",")) {
    const tokens = val
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    // If all numeric, sort numerically, else alphabetically
    const allNumeric = tokens.every((t) => /^\d+$/.test(t));
    if (allNumeric) {
      tokens.sort((a, b) => Number(a) - Number(b));
    } else {
      tokens.sort();
    }
    val = tokens.join(", ");
  }

  return val;
}

/**
 * Creates SHA-256 hash from normalized answer text.
 */
export function hashAnswer(input: string): string {
  const normalized = normalizeAnswer(input);
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Checks if candidate matches target, tolerating file path vs basename differences.
 * e.g. "/usr/local/bin/check_parser" matches "check_parser".
 */
function matchesWithBasenameTolerance(candidate: string, target: string): boolean {
  if (candidate === target) return true;

  // Extract basename from target if it looks like a path
  if (target.includes("/")) {
    const base = target.split("/").filter(Boolean).pop();
    if (base && candidate === base) return true;
  }

  // Extract basename from candidate if user provided full path
  if (candidate.includes("/")) {
    const base = candidate.split("/").filter(Boolean).pop();
    if (base && (base === target || target.endsWith("/" + base))) return true;
  }

  return false;
}

/**
 * Verifies user's submitted milestone answer against expected answer / hash with smart tolerance.
 */
export function verifyMilestoneAnswer(options: VerifyMilestoneOptions): VerifyMilestoneResult {
  const { userAnswer, expectedAnswer, answerHash, taskType = "question" } = options;

  const rawTrimmed = (userAnswer || "").trim();
  if (!rawTrimmed) {
    return {
      isCorrect: false,
      normalizedUserAnswer: "",
      feedback: "Answer cannot be empty.",
    };
  }

  const normalizedUser = normalizeAnswer(rawTrimmed);
  const userHash = hashAnswer(rawTrimmed);

  // 1. Direct hash match (ultra-fast & secure server-side check)
  if (answerHash && userHash === answerHash.toLowerCase().trim()) {
    return {
      isCorrect: true,
      normalizedUserAnswer: normalizedUser,
    };
  }

  // 2. Flags: check exact or normalized flag match
  if (taskType === "user_flag" || taskType === "root_flag") {
    if (expectedAnswer) {
      const trimmedExpected = expectedAnswer.trim();
      const isFlagMatch =
        rawTrimmed === trimmedExpected ||
        rawTrimmed.toLowerCase() === trimmedExpected.toLowerCase();
      if (isFlagMatch) {
        return {
          isCorrect: true,
          normalizedUserAnswer: rawTrimmed,
        };
      }
    }
  }

  // 3. Expected answer verification with multi-alias and path tolerance
  if (expectedAnswer) {
    // If expectedAnswer contains multiple options separated by '|'
    const validAliases = expectedAnswer
      .split("|")
      .map((alias) => normalizeAnswer(alias))
      .filter((alias) => alias.length > 0);

    for (const alias of validAliases) {
      if (matchesWithBasenameTolerance(normalizedUser, alias)) {
        return {
          isCorrect: true,
          normalizedUserAnswer: normalizedUser,
        };
      }
    }
  }

  // 4. Fallback for exploratory practice without writeup / expected answer
  if (!expectedAnswer && !answerHash) {
    return {
      isCorrect: true,
      normalizedUserAnswer: normalizedUser,
      feedback: "Answer accepted for generic methodology practice.",
    };
  }

  return {
    isCorrect: false,
    normalizedUserAnswer: normalizedUser,
    feedback: "Incorrect answer. Check your evidence or format and try again.",
  };
}
