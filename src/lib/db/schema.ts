import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  inet,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const generationRunStatusEnum = pgEnum("generation_run_status", [
  "pending",
  "parsing",
  "extracting",
  "graph_building",
  "verifying",
  "completed",
  "failed",
]);

export const checkPriorityEnum = pgEnum("check_priority", [
  "required",
  "recommended",
  "suggested",
]);

export const trainingSessionStatusEnum = pgEnum("training_session_status", [
  "not_started",
  "in_progress",
  "paused",
  "completed",
]);

export const trainingSessionModeEnum = pgEnum("training_session_mode", [
  "guided",
  "adventure",
]);

export const milestoneTaskTypeEnum = pgEnum("milestone_task_type", [
  "question",
  "user_flag",
  "root_flag",
]);

export const milestoneStatusEnum = pgEnum("milestone_status", [
  "locked",
  "unlocked",
  "completed",
  "skipped",
]);

export const sessionPhaseStatusEnum = pgEnum("session_phase_status", [
  "locked",
  "active",
  "completed",
]);

export const sessionCheckProvenanceEnum = pgEnum(
  "session_check_provenance",
  ["core", "playbook", "contextual", "ai_generated", "generic"],
);

export const sessionCheckStatusEnum = pgEnum("session_check_status", [
  "inactive",
  "active",
  "completed",
  "skipped",
  "superseded",
]);

export const findingEvidenceStateEnum = pgEnum("finding_evidence_state", [
  "observed",
  "inferred",
  "confirmed",
]);

export const findingImportanceEnum = pgEnum("finding_importance", [
  "low",
  "medium",
  "high",
]);

export const findingContextKindEnum = pgEnum("finding_context_kind", [
  "service", "protocol", "os", "surface", "access", "technology",
]);

export const sessionContextStateEnum = pgEnum("session_context_state", [
  "active", "inactive",
]);

export const hypothesisOutcomeEnum = pgEnum("hypothesis_outcome", [
  "open",
  "confirmed",
  "rejected",
  "inconclusive",
]);

export const attemptOutcomeEnum = pgEnum("attempt_outcome", [
  "confirmed",
  "rejected",
  "inconclusive",
]);

export const methodologyDeviationTypeEnum = pgEnum(
  "methodology_deviation_type",
  ["phase_gate_override"],
);

const createdAt = timestamp("created_at", { withTimezone: true })
  .defaultNow()
  .notNull();

const updatedAt = timestamp("updated_at", { withTimezone: true })
  .defaultNow()
  .$onUpdate(() => new Date())
  .notNull();

export const frameworks = pgTable(
  "frameworks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 128 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    version: integer("version").notNull(),
    description: text("description"),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("frameworks_slug_unique").on(table.slug),
    check("frameworks_version_positive", sql`${table.version} > 0`),
  ],
);

export const frameworkPhases = pgTable(
  "framework_phases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    frameworkId: uuid("framework_id")
      .notNull()
      .references(() => frameworks.id, { onDelete: "cascade" }),
    semanticKey: varchar("semantic_key", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("framework_phases_framework_semantic_key_unique").on(
      table.frameworkId,
      table.semanticKey,
    ),
    unique("framework_phases_framework_sort_order_unique").on(
      table.frameworkId,
      table.sortOrder,
    ),
    check("framework_phases_sort_order_nonnegative", sql`${table.sortOrder} >= 0`),
  ],
);

export const frameworkChecks = pgTable(
  "framework_checks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    frameworkPhaseId: uuid("framework_phase_id")
      .notNull()
      .references(() => frameworkPhases.id, { onDelete: "cascade" }),
    semanticKey: varchar("semantic_key", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    priority: checkPriorityEnum("priority").notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("framework_checks_phase_semantic_key_unique").on(
      table.frameworkPhaseId,
      table.semanticKey,
    ),
    unique("framework_checks_phase_sort_order_unique").on(
      table.frameworkPhaseId,
      table.sortOrder,
    ),
    check("framework_checks_sort_order_nonnegative", sql`${table.sortOrder} >= 0`),
  ],
);

export const trainingSessions = pgTable(
  "training_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    frameworkId: uuid("framework_id")
      .notNull()
      .references(() => frameworks.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 255 }).notNull(),
    status: trainingSessionStatusEnum("status").default("not_started").notNull(),
    mode: trainingSessionModeEnum("mode").default("guided").notNull(),
    targetIp: inet("target_ip"),
    userFlag: text("user_flag"),
    userFlagSubmittedAt: timestamp("user_flag_submitted_at", { withTimezone: true }),
    rootFlag: text("root_flag"),
    rootFlagSubmittedAt: timestamp("root_flag_submitted_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("training_sessions_framework_id_index").on(table.frameworkId),
    index("training_sessions_status_updated_at_index").on(
      table.status,
      table.updatedAt,
    ),
    index("training_sessions_mode_index").on(table.mode),
  ],
);

export const sessionPhases = pgTable(
  "session_phases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainingSessionId: uuid("training_session_id")
      .notNull()
      .references(() => trainingSessions.id, { onDelete: "cascade" }),
    frameworkPhaseId: uuid("framework_phase_id").references(
      () => frameworkPhases.id,
      { onDelete: "set null" },
    ),
    semanticKey: varchar("semantic_key", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull(),
    status: sessionPhaseStatusEnum("status").default("locked").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("session_phases_session_semantic_key_unique").on(
      table.trainingSessionId,
      table.semanticKey,
    ),
    unique("session_phases_session_sort_order_unique").on(
      table.trainingSessionId,
      table.sortOrder,
    ),
    index("session_phases_framework_phase_id_index").on(table.frameworkPhaseId),
    check("session_phases_sort_order_nonnegative", sql`${table.sortOrder} >= 0`),
  ],
);

export const sessionChecks = pgTable(
  "session_checks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainingSessionId: uuid("training_session_id")
      .notNull()
      .references(() => trainingSessions.id, { onDelete: "cascade" }),
    sessionPhaseId: uuid("session_phase_id")
      .notNull()
      .references(() => sessionPhases.id, { onDelete: "cascade" }),
    frameworkCheckId: uuid("framework_check_id").references(
      () => frameworkChecks.id,
      { onDelete: "set null" },
    ),
    semanticKey: varchar("semantic_key", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    priority: checkPriorityEnum("priority").notNull(),
    provenance: sessionCheckProvenanceEnum("provenance").notNull(),
    sortOrder: integer("sort_order").notNull(),
    status: sessionCheckStatusEnum("status").default("inactive").notNull(),
    sourceVersion: integer("source_version"),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    skippedAt: timestamp("skipped_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("session_checks_session_semantic_key_unique").on(
      table.trainingSessionId,
      table.semanticKey,
    ),
    unique("session_checks_phase_sort_order_unique").on(
      table.sessionPhaseId,
      table.sortOrder,
    ),
    index("session_checks_session_phase_id_index").on(table.sessionPhaseId),
    index("session_checks_framework_check_id_index").on(table.frameworkCheckId),
    index("session_checks_session_status_index").on(
      table.trainingSessionId,
      table.status,
    ),
    check(
      "session_checks_source_version_positive",
      sql`${table.sourceVersion} is null or ${table.sourceVersion} > 0`,
    ),
    check("session_checks_sort_order_nonnegative", sql`${table.sortOrder} >= 0`),
  ],
);

export const findings = pgTable(
  "findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainingSessionId: uuid("training_session_id")
      .notNull()
      .references(() => trainingSessions.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    category: varchar("category", { length: 128 }).notNull(),
    evidence: text("evidence").notNull(),
    evidenceState: findingEvidenceStateEnum("evidence_state").notNull(),
    contextKind: findingContextKindEnum("context_kind"),
    contextValue: varchar("context_value", { length: 255 }),
    importance: findingImportanceEnum("importance").notNull(),
    source: text("source"),
    notes: text("notes"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("findings_training_session_id_index").on(table.trainingSessionId),
    unique("findings_session_id_unique").on(table.trainingSessionId, table.id),
    check("findings_context_pair", sql`
      (${table.contextKind} is null and ${table.contextValue} is null) or
      (${table.contextKind} is not null and ${table.contextValue} is not null
        and length(trim(${table.contextValue})) > 0)
    `),
  ],
);

export const sessionContexts = pgTable(
  "session_contexts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainingSessionId: uuid("training_session_id").notNull()
      .references(() => trainingSessions.id, { onDelete: "cascade" }),
    canonicalKey: varchar("canonical_key", { length: 255 }).notNull(),
    state: sessionContextStateEnum("state").notNull().default("active"),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("session_contexts_session_key_unique").on(table.trainingSessionId, table.canonicalKey),
  ],
);

export const contextObservations = pgTable(
  "context_observations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainingSessionId: uuid("training_session_id").notNull(),
    findingId: uuid("finding_id").notNull(),
    canonicalKey: varchar("canonical_key", { length: 255 }).notNull(),
    sourceKind: findingContextKindEnum("source_kind").notNull(),
    sourceValue: varchar("source_value", { length: 255 }).notNull(),
    createdAt,
    retractedAt: timestamp("retracted_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      name: "context_observations_finding_session_fk",
      columns: [table.trainingSessionId, table.findingId],
      foreignColumns: [findings.trainingSessionId, findings.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "context_observations_context_session_fk",
      columns: [table.trainingSessionId, table.canonicalKey],
      foreignColumns: [sessionContexts.trainingSessionId, sessionContexts.canonicalKey],
    }).onDelete("cascade"),
    uniqueIndex("context_observations_active_finding_key_unique")
      .on(table.trainingSessionId, table.findingId, table.canonicalKey)
      .where(sql`${table.retractedAt} is null`),
    index("context_observations_active_session_key_index")
      .on(table.trainingSessionId, table.canonicalKey)
      .where(sql`${table.retractedAt} is null`),
  ],
);

export const hypotheses = pgTable(
  "hypotheses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainingSessionId: uuid("training_session_id")
      .notNull()
      .references(() => trainingSessions.id, { onDelete: "cascade" }),
    basedOnFindingId: uuid("based_on_finding_id").references(() => findings.id, {
      onDelete: "set null",
    }),
    hypothesis: text("hypothesis").notNull(),
    reasoning: text("reasoning").notNull(),
    expectedResult: text("expected_result").notNull(),
    testApproach: text("test_approach").notNull(),
    outcome: hypothesisOutcomeEnum("outcome").default("open").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("hypotheses_training_session_id_index").on(table.trainingSessionId),
    index("hypotheses_based_on_finding_id_index").on(table.basedOnFindingId),
  ],
);

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainingSessionId: uuid("training_session_id")
      .notNull()
      .references(() => trainingSessions.id, { onDelete: "cascade" }),
    hypothesisId: uuid("hypothesis_id").references(() => hypotheses.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    notes: text("notes"),
    result: text("result"),
    outcome: attemptOutcomeEnum("outcome").notNull(),
    createdAt,
  },
  (table) => [
    index("attempts_training_session_id_index").on(table.trainingSessionId),
    index("attempts_hypothesis_id_index").on(table.hypothesisId),
  ],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainingSessionId: uuid("training_session_id")
      .notNull()
      .references(() => trainingSessions.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }),
    body: text("body").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [index("notes_training_session_id_index").on(table.trainingSessionId)],
);

export const methodologyDeviations = pgTable(
  "methodology_deviations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainingSessionId: uuid("training_session_id")
      .notNull()
      .references(() => trainingSessions.id, { onDelete: "cascade" }),
    sessionPhaseId: uuid("session_phase_id").references(() => sessionPhases.id, {
      onDelete: "set null",
    }),
    type: methodologyDeviationTypeEnum("type").notNull(),
    reason: text("reason"),
    createdAt,
  },
  (table) => [
    index("methodology_deviations_training_session_id_index").on(
      table.trainingSessionId,
    ),
    index("methodology_deviations_session_phase_id_index").on(
      table.sessionPhaseId,
    ),
  ],
);

export const writeups = pgTable(
  "writeups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    filename: varchar("filename", { length: 255 }).notNull(),
    format: varchar("format", { length: 32 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256Hash: varchar("sha256_hash", { length: 64 }).notNull(),
    characterCount: integer("character_count").notNull(),
    wordCount: integer("word_count").notNull(),
    pageCount: integer("page_count"),
    normalizedText: text("normalized_text").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("writeups_sha256_hash_index").on(table.sha256Hash),
  ],
);

export const generationRuns = pgTable(
  "generation_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    writeupId: uuid("writeup_id").references(() => writeups.id, {
      onDelete: "cascade",
    }),
    trainingSessionId: uuid("training_session_id").references(
      () => trainingSessions.id,
      { onDelete: "set null" },
    ),
    fingerprint: varchar("fingerprint", { length: 64 }).notNull(),
    status: generationRunStatusEnum("status").default("pending").notNull(),
    currentStep: varchar("current_step", { length: 64 }),
    progressPercent: integer("progress_percent").default(0).notNull(),
    error: text("error"),
    factsJson: text("facts_json"),
    metadataJson: text("metadata_json"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("generation_runs_fingerprint_index").on(table.fingerprint),
    index("generation_runs_status_index").on(table.status),
    index("generation_runs_training_session_id_index").on(table.trainingSessionId),
  ],
);

export const machineProfiles = pgTable(
  "machine_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainingSessionId: uuid("training_session_id")
      .notNull()
      .references(() => trainingSessions.id, { onDelete: "cascade" }),
    generationRunId: uuid("generation_run_id").references(
      () => generationRuns.id,
      { onDelete: "set null" },
    ),
    name: varchar("name", { length: 255 }).notNull(),
    platform: varchar("platform", { length: 128 }).default("Unknown").notNull(),
    os: varchar("os", { length: 64 }).default("unknown").notNull(),
    difficulty: varchar("difficulty", { length: 64 }).default("unknown").notNull(),
    author: varchar("author", { length: 128 }),
    targetIp: varchar("target_ip", { length: 255 }),
    summary: text("summary"),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("machine_profiles_training_session_id_unique").on(table.trainingSessionId),
    index("machine_profiles_generation_run_id_index").on(table.generationRunId),
  ],
);

export const attackGraphs = pgTable(
  "attack_graphs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    generationRunId: uuid("generation_run_id").references(
      () => generationRuns.id,
      { onDelete: "cascade" },
    ),
    trainingSessionId: uuid("training_session_id").references(
      () => trainingSessions.id,
      { onDelete: "cascade" },
    ),
    machineName: varchar("machine_name", { length: 255 }).notNull(),
    entryNodeIdsJson: text("entry_node_ids_json").notNull(),
    terminalNodeIdsJson: text("terminal_node_ids_json").notNull(),
    referencePathNodeIdsJson: text("reference_path_node_ids_json").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("attack_graphs_training_session_id_index").on(table.trainingSessionId),
    index("attack_graphs_generation_run_id_index").on(table.generationRunId),
  ],
);

export const attackNodes = pgTable(
  "attack_nodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attackGraphId: uuid("attack_graph_id")
      .notNull()
      .references(() => attackGraphs.id, { onDelete: "cascade" }),
    nodeKey: varchar("node_key", { length: 255 }).notNull(),
    semanticKey: varchar("semantic_key", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    phase: varchar("phase", { length: 64 }).notNull(),
    kind: varchar("kind", { length: 64 }).notNull(),
    spoilerLevel: integer("spoiler_level").default(0).notNull(),
    isEntryPoint: boolean("is_entry_point").default(false).notNull(),
    isTerminal: boolean("is_terminal").default(false).notNull(),
    metadataJson: text("metadata_json"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("attack_nodes_attack_graph_id_index").on(table.attackGraphId),
    index("attack_nodes_node_key_index").on(table.nodeKey),
  ],
);

export const attackEdges = pgTable(
  "attack_edges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attackGraphId: uuid("attack_graph_id")
      .notNull()
      .references(() => attackGraphs.id, { onDelete: "cascade" }),
    sourceNodeKey: varchar("source_node_key", { length: 255 }).notNull(),
    targetNodeKey: varchar("target_node_key", { length: 255 }).notNull(),
    dependencyType: varchar("dependency_type", { length: 32 }).default("hard").notNull(),
    description: text("description"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("attack_edges_attack_graph_id_index").on(table.attackGraphId),
  ],
);

export const graphVerifications = pgTable(
  "graph_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attackGraphId: uuid("attack_graph_id")
      .notNull()
      .references(() => attackGraphs.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).notNull(),
    confidence: integer("confidence").notNull(),
    missingStepsJson: text("missing_steps_json").notNull(),
    unsupportedStepsJson: text("unsupported_steps_json").notNull(),
    conflictsJson: text("conflicts_json").notNull(),
    checksJson: text("checks_json").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("graph_verifications_attack_graph_id_index").on(table.attackGraphId),
  ],
);

export const hintRecords = pgTable(
  "hint_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainingSessionId: uuid("training_session_id")
      .notNull()
      .references(() => trainingSessions.id, { onDelete: "cascade" }),
    spoilerLevel: integer("spoiler_level").default(0).notNull(),
    spoilerLevelName: varchar("spoiler_level_name", { length: 32 }).notNull(),
    phaseKey: varchar("phase_key", { length: 64 }).notNull(),
    mode: varchar("mode", { length: 64 }).default("methodology_hint").notNull(),
    userQuery: text("user_query"),
    content: text("content").notNull(),
    conceptExplanation: text("concept_explanation"),
    recommendedTechnique: text("recommended_technique"),
    suggestedToolsJson: text("suggested_tools_json"),
    penaltyPoints: integer("penalty_points").default(0).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("hint_records_training_session_id_index").on(table.trainingSessionId),
    index("hint_records_created_at_index").on(table.createdAt),
    index("hint_records_spoiler_level_index").on(table.spoilerLevel),
  ],
);

export const sessionMilestones = pgTable(
  "session_milestones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trainingSessionId: uuid("training_session_id")
      .notNull()
      .references(() => trainingSessions.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    question: text("question").notNull(),
    taskType: milestoneTaskTypeEnum("task_type").default("question").notNull(),
    phase: varchar("phase", { length: 64 }).notNull(),
    answerHash: varchar("answer_hash", { length: 64 }),
    expectedAnswer: text("expected_answer"),
    formatHint: varchar("format_hint", { length: 128 }),
    hint: text("hint"),
    status: milestoneStatusEnum("status").default("locked").notNull(),
    userAnswer: text("user_answer"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("session_milestones_session_sort_order_unique").on(
      table.trainingSessionId,
      table.sortOrder,
    ),
    index("session_milestones_training_session_id_index").on(
      table.trainingSessionId,
    ),
    index("session_milestones_status_index").on(table.status),
    check(
      "session_milestones_sort_order_positive",
      sql`${table.sortOrder} > 0`,
    ),
  ],
);



