import { createHash } from "node:crypto";
import { buildAttackGraphFromFacts } from "../attack-graph/builder";
import type { AttackGraph } from "../attack-graph/types";
import { extractMachineFacts } from "../facts/extractor";
import type { ExtractedMachineFacts } from "../facts/types";
import { verifyAttackGraph } from "../verification/verifier";
import type { GraphVerification } from "../verification/types";
import { parseWriteupFile } from "../writeups/parser";
import * as genRepo from "./generation-repository";
import { createTrainingSession } from "./service";
import { generateMilestonesFromFactsAndGraph } from "./milestone-generator";
import { initializeSessionMilestones } from "./milestone-service";
import type { TrainingTransaction } from "./repository";

export interface GenerateTrainingSessionInput {
  readonly writeupFile: {
    readonly filename: string;
    readonly buffer: Buffer;
    readonly mimeType?: string | null;
  };
  readonly sessionNameOverride?: string;
  readonly forceRegenerate?: boolean;
  readonly extractFactsFn?: (options: {
    writeupText: string;
  }) => Promise<ExtractedMachineFacts>;
}

export interface GenerateTrainingSessionResult {
  readonly ok: boolean;
  readonly sessionId?: string;
  readonly generationRunId: string;
  readonly fingerprint: string;
  readonly machineProfile?: {
    readonly name: string;
    readonly platform: string;
    readonly os: string;
    readonly difficulty: string;
    readonly author?: string;
    readonly targetIp?: string;
  };
  readonly error?: string;
  readonly verification?: GraphVerification;
}

/**
 * Computes a SHA-256 fingerprint for document idempotency.
 */
export function computeFingerprint(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Orchestrates the full writeup-to-training pipeline:
 * 1. Fingerprint & Document parsing
 * 2. Generation run tracking
 * 3. Structured machine facts extraction
 * 4. Hidden attack graph modeling
 * 5. Automated graph verification (blocks on failed graph)
 * 6. Hidden knowledge persistence
 * 7. PTES TrainingSession creation
 */
export async function generateTrainingSession(
  input: GenerateTrainingSessionInput,
): Promise<GenerateTrainingSessionResult> {
  const { writeupFile, sessionNameOverride, forceRegenerate = false } = input;
  const fingerprint = computeFingerprint(writeupFile.buffer);

  // 1. Idempotency Check: Reuse existing completed run if not forced to regenerate
  if (!forceRegenerate) {
    const existingRun = await genRepo.findCompletedGenerationRun(fingerprint);
    if (existingRun && existingRun.status === "completed" && existingRun.trainingSessionId) {
      // If we have cached facts, return the existing session
      let cachedProfile;
      if (existingRun.factsJson) {
        try {
          const parsedFacts = JSON.parse(existingRun.factsJson) as ExtractedMachineFacts;
          cachedProfile = parsedFacts.profile;
        } catch {
          // ignore cache parse failure
        }
      }

      return {
        ok: true,
        sessionId: existingRun.trainingSessionId,
        generationRunId: existingRun.id,
        fingerprint,
        machineProfile: cachedProfile,
      };
    }
  }

  // 2. Document Parsing
  let writeupRecord = await genRepo.findWriteupByHash(fingerprint);
  let parsedText = writeupRecord?.normalizedText;

  if (!writeupRecord || !parsedText) {
    const parsedDoc = await parseWriteupFile({
      filename: writeupFile.filename,
      buffer: writeupFile.buffer,
      mimeType: writeupFile.mimeType,
    });

    writeupRecord = await genRepo.insertWriteup({
      filename: parsedDoc.filename,
      format: parsedDoc.format,
      sizeBytes: parsedDoc.sizeBytes,
      sha256Hash: parsedDoc.sha256Hash,
      characterCount: parsedDoc.characterCount,
      wordCount: parsedDoc.wordCount,
      pageCount: parsedDoc.pageCount,
      normalizedText: parsedDoc.normalizedText,
    });

    parsedText = parsedDoc.normalizedText;
  }

  // 3. Create Generation Run Record
  const run = await genRepo.createGenerationRun({
    writeupId: writeupRecord.id,
    fingerprint,
    status: "parsing",
    currentStep: "parsing",
    progressPercent: 20,
  });

  try {
    // 4. Fact Extraction
    await genRepo.updateGenerationRun(run.id, {
      status: "extracting",
      currentStep: "extracting",
      progressPercent: 40,
    });

    const extractFn = input.extractFactsFn || extractMachineFacts;
    const facts: ExtractedMachineFacts = await extractFn({
      writeupText: parsedText,
    });

    await genRepo.updateGenerationRun(run.id, {
      factsJson: JSON.stringify(facts),
    });

    // 5. Attack Graph Building
    await genRepo.updateGenerationRun(run.id, {
      status: "graph_building",
      currentStep: "graph_building",
      progressPercent: 65,
    });

    const graph: AttackGraph = buildAttackGraphFromFacts(facts);

    // 6. Automated Graph Verification
    await genRepo.updateGenerationRun(run.id, {
      status: "verifying",
      currentStep: "verifying",
      progressPercent: 80,
    });

    const verification: GraphVerification = verifyAttackGraph({ graph, facts });

    // Enforce Rule: "Graph failed tidak boleh diam-diam menghasilkan TrainingSession"
    if (verification.status === "failed") {
      const failureReason = [
        ...verification.conflicts,
        ...verification.missingSteps,
        ...verification.unsupportedSteps,
      ].join("; ") || "Structural verification failed";

      await genRepo.updateGenerationRun(run.id, {
        status: "failed",
        currentStep: "failed",
        error: failureReason,
        progressPercent: 0,
      });

      return {
        ok: false,
        generationRunId: run.id,
        fingerprint,
        error: `Attack path verification failed: ${failureReason}`,
        verification,
      };
    }

    // 7. Training Session Creation & Hidden Knowledge Persistence
    const sessionName =
      sessionNameOverride?.trim() ||
      facts.profile.name ||
      writeupFile.filename.replace(/\.[^/.]+$/, "");

    const sessionAggregate = await createTrainingSession({
      name: sessionName,
    });

    const milestoneDrafts = generateMilestonesFromFactsAndGraph(facts, graph);

    // Atomically persist hidden knowledge & link with session
    await genRepo.generationTransaction(async (tx) => {
      await genRepo.persistHiddenKnowledge(tx, {
        generationRunId: run.id,
        trainingSessionId: sessionAggregate.session.id,
        facts,
        graph,
        verification,
      });

      await initializeSessionMilestones(
        sessionAggregate.session.id,
        milestoneDrafts,
        tx as unknown as TrainingTransaction,
      );
    });

    // Mark Generation Run Completed
    await genRepo.updateGenerationRun(run.id, {
      status: "completed",
      currentStep: "ready",
      trainingSessionId: sessionAggregate.session.id,
      progressPercent: 100,
    });

    return {
      ok: true,
      sessionId: sessionAggregate.session.id,
      generationRunId: run.id,
      fingerprint,
      machineProfile: {
        name: facts.profile.name,
        platform: facts.profile.platform,
        os: facts.profile.os,
        difficulty: facts.profile.difficulty,
        author: facts.profile.author,
        targetIp: facts.profile.targetIp,
      },
      verification,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown orchestration error";

    await genRepo.updateGenerationRun(run.id, {
      status: "failed",
      currentStep: "failed",
      error: errorMessage,
      progressPercent: 0,
    });

    return {
      ok: false,
      generationRunId: run.id,
      fingerprint,
      error: errorMessage,
    };
  }
}
