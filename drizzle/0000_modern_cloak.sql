CREATE TYPE "public"."attempt_outcome" AS ENUM('confirmed', 'rejected', 'inconclusive');--> statement-breakpoint
CREATE TYPE "public"."check_priority" AS ENUM('required', 'recommended', 'suggested');--> statement-breakpoint
CREATE TYPE "public"."finding_evidence_state" AS ENUM('observed', 'inferred', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."finding_importance" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."hypothesis_outcome" AS ENUM('open', 'confirmed', 'rejected', 'inconclusive');--> statement-breakpoint
CREATE TYPE "public"."methodology_deviation_type" AS ENUM('phase_gate_override');--> statement-breakpoint
CREATE TYPE "public"."session_check_provenance" AS ENUM('core', 'playbook', 'contextual', 'ai_generated', 'generic');--> statement-breakpoint
CREATE TYPE "public"."session_check_status" AS ENUM('inactive', 'active', 'completed', 'skipped', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."session_phase_status" AS ENUM('locked', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "public"."training_session_status" AS ENUM('not_started', 'in_progress', 'paused', 'completed');--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_session_id" uuid NOT NULL,
	"hypothesis_id" uuid,
	"action" text NOT NULL,
	"notes" text,
	"result" text,
	"outcome" "attempt_outcome" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_session_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" varchar(128) NOT NULL,
	"evidence" text NOT NULL,
	"evidence_state" "finding_evidence_state" NOT NULL,
	"importance" "finding_importance" NOT NULL,
	"source" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "framework_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"framework_phase_id" uuid NOT NULL,
	"semantic_key" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"priority" "check_priority" NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "framework_checks_phase_semantic_key_unique" UNIQUE("framework_phase_id","semantic_key"),
	CONSTRAINT "framework_checks_phase_sort_order_unique" UNIQUE("framework_phase_id","sort_order"),
	CONSTRAINT "framework_checks_sort_order_nonnegative" CHECK ("framework_checks"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "framework_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"framework_id" uuid NOT NULL,
	"semantic_key" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "framework_phases_framework_semantic_key_unique" UNIQUE("framework_id","semantic_key"),
	CONSTRAINT "framework_phases_framework_sort_order_unique" UNIQUE("framework_id","sort_order"),
	CONSTRAINT "framework_phases_sort_order_nonnegative" CHECK ("framework_phases"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "frameworks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(128) NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" integer NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "frameworks_slug_unique" UNIQUE("slug"),
	CONSTRAINT "frameworks_version_positive" CHECK ("frameworks"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "hypotheses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_session_id" uuid NOT NULL,
	"based_on_finding_id" uuid,
	"hypothesis" text NOT NULL,
	"reasoning" text NOT NULL,
	"expected_result" text NOT NULL,
	"test_approach" text NOT NULL,
	"outcome" "hypothesis_outcome" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "methodology_deviations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_session_id" uuid NOT NULL,
	"session_phase_id" uuid,
	"type" "methodology_deviation_type" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_session_id" uuid NOT NULL,
	"title" varchar(255),
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_session_id" uuid NOT NULL,
	"session_phase_id" uuid NOT NULL,
	"framework_check_id" uuid,
	"semantic_key" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"priority" "check_priority" NOT NULL,
	"provenance" "session_check_provenance" NOT NULL,
	"status" "session_check_status" DEFAULT 'inactive' NOT NULL,
	"source_version" integer,
	"activated_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"skipped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_checks_session_semantic_key_unique" UNIQUE("training_session_id","semantic_key"),
	CONSTRAINT "session_checks_source_version_positive" CHECK ("session_checks"."source_version" is null or "session_checks"."source_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "session_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_session_id" uuid NOT NULL,
	"framework_phase_id" uuid,
	"semantic_key" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"sort_order" integer NOT NULL,
	"status" "session_phase_status" DEFAULT 'locked' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_phases_session_semantic_key_unique" UNIQUE("training_session_id","semantic_key"),
	CONSTRAINT "session_phases_session_sort_order_unique" UNIQUE("training_session_id","sort_order"),
	CONSTRAINT "session_phases_sort_order_nonnegative" CHECK ("session_phases"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "training_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"framework_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" "training_session_status" DEFAULT 'not_started' NOT NULL,
	"target_ip" "inet",
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_hypothesis_id_hypotheses_id_fk" FOREIGN KEY ("hypothesis_id") REFERENCES "public"."hypotheses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "framework_checks" ADD CONSTRAINT "framework_checks_framework_phase_id_framework_phases_id_fk" FOREIGN KEY ("framework_phase_id") REFERENCES "public"."framework_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "framework_phases" ADD CONSTRAINT "framework_phases_framework_id_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."frameworks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD CONSTRAINT "hypotheses_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD CONSTRAINT "hypotheses_based_on_finding_id_findings_id_fk" FOREIGN KEY ("based_on_finding_id") REFERENCES "public"."findings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "methodology_deviations" ADD CONSTRAINT "methodology_deviations_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "methodology_deviations" ADD CONSTRAINT "methodology_deviations_session_phase_id_session_phases_id_fk" FOREIGN KEY ("session_phase_id") REFERENCES "public"."session_phases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_checks" ADD CONSTRAINT "session_checks_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_checks" ADD CONSTRAINT "session_checks_session_phase_id_session_phases_id_fk" FOREIGN KEY ("session_phase_id") REFERENCES "public"."session_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_checks" ADD CONSTRAINT "session_checks_framework_check_id_framework_checks_id_fk" FOREIGN KEY ("framework_check_id") REFERENCES "public"."framework_checks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_phases" ADD CONSTRAINT "session_phases_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_phases" ADD CONSTRAINT "session_phases_framework_phase_id_framework_phases_id_fk" FOREIGN KEY ("framework_phase_id") REFERENCES "public"."framework_phases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_framework_id_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."frameworks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempts_training_session_id_index" ON "attempts" USING btree ("training_session_id");--> statement-breakpoint
CREATE INDEX "attempts_hypothesis_id_index" ON "attempts" USING btree ("hypothesis_id");--> statement-breakpoint
CREATE INDEX "findings_training_session_id_index" ON "findings" USING btree ("training_session_id");--> statement-breakpoint
CREATE INDEX "hypotheses_training_session_id_index" ON "hypotheses" USING btree ("training_session_id");--> statement-breakpoint
CREATE INDEX "hypotheses_based_on_finding_id_index" ON "hypotheses" USING btree ("based_on_finding_id");--> statement-breakpoint
CREATE INDEX "methodology_deviations_training_session_id_index" ON "methodology_deviations" USING btree ("training_session_id");--> statement-breakpoint
CREATE INDEX "methodology_deviations_session_phase_id_index" ON "methodology_deviations" USING btree ("session_phase_id");--> statement-breakpoint
CREATE INDEX "notes_training_session_id_index" ON "notes" USING btree ("training_session_id");--> statement-breakpoint
CREATE INDEX "session_checks_session_phase_id_index" ON "session_checks" USING btree ("session_phase_id");--> statement-breakpoint
CREATE INDEX "session_checks_framework_check_id_index" ON "session_checks" USING btree ("framework_check_id");--> statement-breakpoint
CREATE INDEX "session_checks_session_status_index" ON "session_checks" USING btree ("training_session_id","status");--> statement-breakpoint
CREATE INDEX "session_phases_framework_phase_id_index" ON "session_phases" USING btree ("framework_phase_id");--> statement-breakpoint
CREATE INDEX "training_sessions_framework_id_index" ON "training_sessions" USING btree ("framework_id");--> statement-breakpoint
CREATE INDEX "training_sessions_status_updated_at_index" ON "training_sessions" USING btree ("status","updated_at");