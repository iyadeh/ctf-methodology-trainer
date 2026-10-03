import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attackEdges,
  attackGraphs,
  attackNodes,
  generationRuns,
  graphVerifications,
  machineProfiles,
  writeups,
} from "@/lib/db/schema";
import type { AttackGraph } from "../attack-graph/types";
import type { ExtractedMachineFacts } from "../facts/types";
import type { GraphVerification } from "../verification/types";

export type GenerationTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

/**
 * Executes an operation inside a database transaction.
 */
export function generationTransaction<T>(
  operation: (tx: GenerationTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(operation);
}

/**
 * Finds an existing writeup record by SHA-256 fingerprint.
 */
export async function findWriteupByHash(
  sha256Hash: string,
  tx?: GenerationTransaction,
) {
  const client = tx || db;
  const [record] = await client
    .select()
    .from(writeups)
    .where(eq(writeups.sha256Hash, sha256Hash))
    .limit(1);
  return record || null;
}

/**
 * Inserts or returns an existing writeup record.
 */
export async function insertWriteup(
  data: typeof writeups.$inferInsert,
  tx?: GenerationTransaction,
) {
  const client = tx || db;
  const [record] = await client.insert(writeups).values(data).returning();
  return record;
}

/**
 * Finds the latest completed generation run matching the fingerprint.
 */
export async function findCompletedGenerationRun(
  fingerprint: string,
  tx?: GenerationTransaction,
) {
  const client = tx || db;
  const [record] = await client
    .select()
    .from(generationRuns)
    .where(eq(generationRuns.fingerprint, fingerprint))
    .orderBy(desc(generationRuns.createdAt))
    .limit(1);
  return record || null;
}

/**
 * Creates a new generation run record.
 */
export async function createGenerationRun(
  data: typeof generationRuns.$inferInsert,
  tx?: GenerationTransaction,
) {
  const client = tx || db;
  const [record] = await client.insert(generationRuns).values(data).returning();
  return record;
}

/**
 * Updates a generation run record.
 */
export async function updateGenerationRun(
  id: string,
  data: Partial<typeof generationRuns.$inferInsert>,
  tx?: GenerationTransaction,
) {
  const client = tx || db;
  const [record] = await client
    .update(generationRuns)
    .set(data)
    .where(eq(generationRuns.id, id))
    .returning();
  return record;
}

/**
 * Persists hidden knowledge (attack graph, nodes, edges, verification, machine profile)
 * and links them to the created training session within a transaction.
 */
export async function persistHiddenKnowledge(
  tx: GenerationTransaction,
  params: {
    readonly generationRunId: string;
    readonly trainingSessionId: string;
    readonly facts: ExtractedMachineFacts;
    readonly graph: AttackGraph;
    readonly verification: GraphVerification;
  },
) {
  const { generationRunId, trainingSessionId, facts, graph, verification } = params;

  // 1. Insert Machine Profile
  const [profile] = await tx
    .insert(machineProfiles)
    .values({
      trainingSessionId,
      generationRunId,
      name: facts.profile.name,
      platform: facts.profile.platform || "Unknown",
      os: facts.profile.os || "unknown",
      difficulty: facts.profile.difficulty || "unknown",
      author: facts.profile.author,
      targetIp: facts.profile.targetIp,
      summary: facts.summary,
    })
    .returning();

  // 2. Insert Attack Graph
  const [savedGraph] = await tx
    .insert(attackGraphs)
    .values({
      generationRunId,
      trainingSessionId,
      machineName: graph.machineName,
      entryNodeIdsJson: JSON.stringify(graph.entryNodeIds),
      terminalNodeIdsJson: JSON.stringify(graph.terminalNodeIds),
      referencePathNodeIdsJson: JSON.stringify(graph.referencePathNodeIds),
    })
    .returning();

  // 3. Insert Attack Nodes
  if (graph.nodes.length > 0) {
    const nodeRows = graph.nodes.map((node) => ({
      attackGraphId: savedGraph.id,
      nodeKey: node.id,
      semanticKey: node.semanticKey,
      title: node.title,
      description: node.description,
      phase: node.phase,
      kind: node.kind,
      spoilerLevel: node.spoilerLevel,
      isEntryPoint: node.isEntryPoint,
      isTerminal: node.isTerminal,
      metadataJson: node.metadata ? JSON.stringify(node.metadata) : null,
    }));
    await tx.insert(attackNodes).values(nodeRows);
  }

  // 4. Insert Attack Edges
  if (graph.edges.length > 0) {
    const edgeRows = graph.edges.map((edge) => ({
      attackGraphId: savedGraph.id,
      sourceNodeKey: edge.sourceNodeId,
      targetNodeKey: edge.targetNodeId,
      dependencyType: edge.dependencyType,
      description: edge.description,
    }));
    await tx.insert(attackEdges).values(edgeRows);
  }

  // 5. Insert Graph Verification
  await tx.insert(graphVerifications).values({
    attackGraphId: savedGraph.id,
    status: verification.status,
    confidence: Math.round(verification.confidence * 100),
    missingStepsJson: JSON.stringify(verification.missingSteps),
    unsupportedStepsJson: JSON.stringify(verification.unsupportedSteps),
    conflictsJson: JSON.stringify(verification.conflicts),
    checksJson: JSON.stringify(verification.checks),
    verifiedAt: new Date(verification.verifiedAt),
  });

  return { profile, attackGraph: savedGraph };
}
