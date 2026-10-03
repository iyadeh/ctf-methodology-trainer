import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  attackEdges,
  attackGraphs,
  attackNodes,
  hintRecords,
} from "@/lib/db/schema";
import type {
  AttackEdge,
  AttackGraph,
  AttackNode,
  AttackNodeKind,
  AttackNodePhase,
  DependencyType,
  SpoilerLevel,
} from "../attack-graph/types";
import type { HintMetrics, HintRecord, NewHintRecord } from "./types";

/**
 * Inserts a new hint/guidance record into the database.
 */
export async function insertHintRecord(
  data: NewHintRecord,
): Promise<HintRecord> {
  const [created] = await db.insert(hintRecords).values(data).returning();
  return created;
}

/**
 * Fetches all hint records for a training session, ordered chronologically.
 */
export async function findHintRecordsBySessionId(
  sessionId: string,
): Promise<HintRecord[]> {
  return db
    .select()
    .from(hintRecords)
    .where(eq(hintRecords.trainingSessionId, sessionId))
    .orderBy(desc(hintRecords.createdAt));
}

/**
 * Computes deterministic hint metrics for session review and scoring.
 */
export async function computeHintMetricsBySessionId(
  sessionId: string,
): Promise<HintMetrics> {
  const rows = await db
    .select()
    .from(hintRecords)
    .where(eq(hintRecords.trainingSessionId, sessionId));

  let methodologyHints = 0;
  let conceptExplanations = 0;
  let machineSpecificHints = 0;
  let fullReveals = 0;
  let totalPenaltyPoints = 0;

  for (const row of rows) {
    totalPenaltyPoints += row.penaltyPoints;

    if (row.mode === "concept_explanation") {
      conceptExplanations += 1;
    } else if (row.spoilerLevel <= 3) {
      methodologyHints += 1;
    }

    if (row.spoilerLevel === 4 || row.spoilerLevel === 5) {
      machineSpecificHints += 1;
    } else if (row.spoilerLevel === 6) {
      fullReveals += 1;
    }
  }

  return {
    totalHints: rows.length,
    methodologyHints,
    conceptExplanations,
    machineSpecificHints,
    fullReveals,
    totalPenaltyPoints,
  };
}

/**
 * Reconstructs the hidden attack graph for a training session if one exists.
 * Hidden knowledge security boundary: Server-side only.
 */
export async function findAttackGraphBySessionId(
  sessionId: string,
): Promise<AttackGraph | null> {
  const [graphRow] = await db
    .select()
    .from(attackGraphs)
    .where(eq(attackGraphs.trainingSessionId, sessionId))
    .limit(1);

  if (!graphRow) {
    return null;
  }

  const nodeRows = await db
    .select()
    .from(attackNodes)
    .where(eq(attackNodes.attackGraphId, graphRow.id));

  const edgeRows = await db
    .select()
    .from(attackEdges)
    .where(eq(attackEdges.attackGraphId, graphRow.id));

  const nodes: AttackNode[] = nodeRows.map((n) => ({
    id: n.nodeKey,
    semanticKey: n.semanticKey,
    title: n.title,
    description: n.description,
    phase: n.phase as AttackNodePhase,
    kind: n.kind as AttackNodeKind,
    spoilerLevel: n.spoilerLevel as SpoilerLevel,
    isEntryPoint: n.isEntryPoint,
    isTerminal: n.isTerminal,
    metadata: n.metadataJson ? JSON.parse(n.metadataJson) : undefined,
  }));

  const edges: AttackEdge[] = edgeRows.map((e) => ({
    id: e.id,
    sourceNodeId: e.sourceNodeKey,
    targetNodeId: e.targetNodeKey,
    dependencyType: e.dependencyType as DependencyType,
    description: e.description || undefined,
  }));

  return {
    id: graphRow.id,
    machineName: graphRow.machineName,
    nodes,
    edges,
    entryNodeIds: JSON.parse(graphRow.entryNodeIdsJson),
    terminalNodeIds: JSON.parse(graphRow.terminalNodeIdsJson),
    referencePathNodeIds: JSON.parse(graphRow.referencePathNodeIdsJson),
    createdAt: graphRow.createdAt.toISOString(),
  };
}
