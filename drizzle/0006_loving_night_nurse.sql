CREATE TABLE "hint_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_session_id" uuid NOT NULL,
	"spoiler_level" integer DEFAULT 0 NOT NULL,
	"spoiler_level_name" varchar(32) NOT NULL,
	"phase_key" varchar(64) NOT NULL,
	"mode" varchar(64) DEFAULT 'methodology_hint' NOT NULL,
	"user_query" text,
	"content" text NOT NULL,
	"concept_explanation" text,
	"recommended_technique" text,
	"suggested_tools_json" text,
	"penalty_points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hint_records" ADD CONSTRAINT "hint_records_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hint_records_training_session_id_index" ON "hint_records" USING btree ("training_session_id");--> statement-breakpoint
CREATE INDEX "hint_records_created_at_index" ON "hint_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "hint_records_spoiler_level_index" ON "hint_records" USING btree ("spoiler_level");