import { sql } from "drizzle-orm";
import {
  check,
  index,
  inet,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

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
    targetIp: inet("target_ip"),
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
    importance: findingImportanceEnum("importance").notNull(),
    source: text("source"),
    notes: text("notes"),
    createdAt,
    updatedAt,
  },
  (table) => [index("findings_training_session_id_index").on(table.trainingSessionId)],
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
