CREATE TYPE "public"."finding_context_kind" AS ENUM('service', 'protocol', 'os', 'surface', 'access');--> statement-breakpoint
CREATE TYPE "public"."session_context_state" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "context_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_session_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"canonical_key" varchar(255) NOT NULL,
	"source_kind" "finding_context_kind" NOT NULL,
	"source_value" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retracted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "session_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_session_id" uuid NOT NULL,
	"canonical_key" varchar(255) NOT NULL,
	"state" "session_context_state" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_contexts_session_key_unique" UNIQUE("training_session_id","canonical_key")
);
--> statement-breakpoint
ALTER TABLE "findings" ADD COLUMN "context_kind" "finding_context_kind";--> statement-breakpoint
ALTER TABLE "findings" ADD COLUMN "context_value" varchar(255);--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_session_id_unique" UNIQUE("training_session_id","id");--> statement-breakpoint
ALTER TABLE "context_observations" ADD CONSTRAINT "context_observations_finding_session_fk" FOREIGN KEY ("training_session_id","finding_id") REFERENCES "public"."findings"("training_session_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_observations" ADD CONSTRAINT "context_observations_context_session_fk" FOREIGN KEY ("training_session_id","canonical_key") REFERENCES "public"."session_contexts"("training_session_id","canonical_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_contexts" ADD CONSTRAINT "session_contexts_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "context_observations_active_finding_key_unique" ON "context_observations" USING btree ("training_session_id","finding_id","canonical_key") WHERE "context_observations"."retracted_at" is null;--> statement-breakpoint
CREATE INDEX "context_observations_active_session_key_index" ON "context_observations" USING btree ("training_session_id","canonical_key") WHERE "context_observations"."retracted_at" is null;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_context_pair" CHECK (
      ("findings"."context_kind" is null and "findings"."context_value" is null) or
      ("findings"."context_kind" is not null and "findings"."context_value" is not null
        and length(trim("findings"."context_value")) > 0)
    );
