import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { findings, trainingSessions } from "@/lib/db/schema";
import { findAttackGraphBySessionId } from "@/modules/mentor/repository";
import {
  isValidUuid,
  loadSessionPhases,
  lockTrainingSession,
  trainingTransaction,
  updateSessionPhase,
  updateTrainingSession,
} from "./repository";
import { TrainingSessionError, type TrainingSessionAggregate } from "./types";
import { getTrainingSession } from "./service";

export const objectiveTypeEnum = z.enum([
  "root_flag",
  "user_flag",
  "challenge_objective",
  "administrator",
  "other",
]);
export type ObjectiveType = z.infer<typeof objectiveTypeEnum>;

export const completeSessionInputSchema = z.object({
  objectiveType: objectiveTypeEnum.optional().default("root_flag"),
  objectiveEvidence: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
export type CompleteSessionInput = z.infer<typeof completeSessionInputSchema>;

export interface RevealedReferencePathNode {
  readonly id: string;
  readonly semanticKey: string;
  readonly title: string;
  readonly description: string;
  readonly phase: string;
  readonly kind: string;
  readonly spoilerLevel: number;
  readonly isEntryPoint: boolean;
  readonly isTerminal: boolean;
  readonly toolsUsed?: readonly string[];
  readonly port?: number;
  readonly protocol?: "tcp" | "udp";
  readonly service?: string;
  readonly cve?: string;
  readonly location?: string;
}

export interface RevealedReferencePathEdge {
  readonly id: string;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly dependencyType: "hard" | "soft";
  readonly description?: string;
}

export interface RevealedReferencePath {
  readonly available: boolean;
  readonly machineName?: string;
  readonly referencePathNodes: readonly RevealedReferencePathNode[];
  readonly allNodes: readonly RevealedReferencePathNode[];
  readonly edges: readonly RevealedReferencePathEdge[];
  readonly entryNodeIds: readonly string[];
  readonly terminalNodeIds: readonly string[];
}

function formatObjectiveTitle(objectiveType?: ObjectiveType): string {
  switch (objectiveType) {
    case "root_flag":
      return "Objective: Root Flag Captured";
    case "user_flag":
      return "Objective: User Flag Captured";
    case "administrator":
      return "Objective: Administrator Compromise";
    case "challenge_objective":
      return "Objective: Challenge Goal Achieved";
    case "other":
    default:
      return "Objective: Target Compromise";
  }
}

/**
 * Manually completes a Training Session, transitions its status to 'completed',
 * locks the active phase, and records any submitted objective evidence as a confirmed finding.
 */
export async function completeTrainingSession(
  sessionId: string,
  rawInput?: CompleteSessionInput,
): Promise<TrainingSessionAggregate> {
  const parsedInput = completeSessionInputSchema.parse(rawInput ?? {});

  await trainingTransaction(async (transaction) => {
    const session = await lockTrainingSession(transaction, sessionId);

    if (session.status === "completed") {
      return;
    }

    if (session.status === "not_started") {
      throw new TrainingSessionError(
        "invalid_transition",
        "Cannot complete a Training Session that has not been started.",
      );
    }

    const now = new Date();

    // 1. Update session status to completed
    await updateTrainingSession(transaction, sessionId, {
      status: "completed",
      completedAt: now,
    });

    // 2. Mark active phase as completed
    const phases = await loadSessionPhases(transaction, sessionId);
    const activePhase = phases.find((p) => p.status === "active");
    if (activePhase) {
      await updateSessionPhase(transaction, activePhase.id, "completed");
    }

    // 3. Record objective evidence if provided
    if (parsedInput.objectiveEvidence && parsedInput.objectiveEvidence.length > 0) {
      const title = formatObjectiveTitle(parsedInput.objectiveType);
      await transaction.insert(findings).values({
        trainingSessionId: sessionId,
        title,
        category: "objective_capture",
        evidence: parsedInput.objectiveEvidence,
        evidenceState: "confirmed",
        importance: "high",
        notes: parsedInput.notes || null,
      });
    }
  });

  return getTrainingSession(sessionId);
}

/**
 * Hidden Knowledge Security Boundary Enforcement:
 * Reference Path and Attack Graph are revealed ONLY after session completion.
 * Returns null if the session is not completed or does not exist.
 */
export async function getRevealedReferencePath(
  sessionId: string,
): Promise<RevealedReferencePath | null> {
  if (!isValidUuid(sessionId)) {
    return null;
  }

  const [sessionRow] = await db
    .select({
      id: trainingSessions.id,
      status: trainingSessions.status,
    })
    .from(trainingSessions)
    .where(eq(trainingSessions.id, sessionId))
    .limit(1);

  if (!sessionRow) {
    return null;
  }

  // STRICT INVARIANT: Hidden solution never leaves server before completion
  if (sessionRow.status !== "completed") {
    return null;
  }

  const attackGraph = await findAttackGraphBySessionId(sessionId);
  if (!attackGraph) {
    return {
      available: false,
      referencePathNodes: [],
      allNodes: [],
      edges: [],
      entryNodeIds: [],
      terminalNodeIds: [],
    };
  }

  const nodeMap = new Map<string, RevealedReferencePathNode>();

  const allNodes: RevealedReferencePathNode[] = attackGraph.nodes.map((n) => {
    const revealed: RevealedReferencePathNode = {
      id: n.id,
      semanticKey: n.semanticKey,
      title: n.title,
      description: n.description,
      phase: n.phase,
      kind: n.kind,
      spoilerLevel: n.spoilerLevel,
      isEntryPoint: n.isEntryPoint,
      isTerminal: n.isTerminal,
      toolsUsed: n.metadata?.toolsUsed,
      port: n.metadata?.port,
      protocol: n.metadata?.protocol,
      service: n.metadata?.service,
      cve: n.metadata?.cve,
      location: n.metadata?.location,
    };
    nodeMap.set(n.id, revealed);
    return revealed;
  });

  // Assemble reference path in canonical order
  const referencePathNodes: RevealedReferencePathNode[] = [];
  for (const nodeId of attackGraph.referencePathNodeIds) {
    const node = nodeMap.get(nodeId);
    if (node) {
      referencePathNodes.push(node);
    }
  }

  // If referencePathNodeIds was empty for some reason, fallback to allNodes
  const finalReferencePath =
    referencePathNodes.length > 0 ? referencePathNodes : allNodes;

  const edges: RevealedReferencePathEdge[] = attackGraph.edges.map((e) => ({
    id: e.id,
    sourceNodeId: e.sourceNodeId,
    targetNodeId: e.targetNodeId,
    dependencyType: e.dependencyType,
    description: e.description,
  }));

  return {
    available: true,
    machineName: attackGraph.machineName,
    referencePathNodes: finalReferencePath,
    allNodes,
    edges,
    entryNodeIds: attackGraph.entryNodeIds,
    terminalNodeIds: attackGraph.terminalNodeIds,
  };
}
