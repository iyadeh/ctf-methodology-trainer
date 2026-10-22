CREATE TYPE "public"."milestone_status" AS ENUM('locked', 'unlocked', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."milestone_task_type" AS ENUM('question', 'user_flag', 'root_flag');--> statement-breakpoint
CREATE TYPE "public"."training_session_mode" AS ENUM('guided', 'adventure');--> statement-breakpoint
CREATE TABLE "session_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_session_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"question" text NOT NULL,
	"task_type" "milestone_task_type" DEFAULT 'question' NOT NULL,
	"phase" varchar(64) NOT NULL,
	"answer_hash" varchar(64),
	"expected_answer" text,
	"format_hint" varchar(128),
	"hint" text,
	"status" "milestone_status" DEFAULT 'locked' NOT NULL,
	"user_answer" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_milestones_session_sort_order_unique" UNIQUE("training_session_id","sort_order"),
	CONSTRAINT "session_milestones_sort_order_positive" CHECK ("session_milestones"."sort_order" > 0)
);
--> statement-breakpoint
ALTER TABLE "training_sessions" ADD COLUMN "mode" "training_session_mode" DEFAULT 'guided' NOT NULL;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD COLUMN "user_flag" text;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD COLUMN "user_flag_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD COLUMN "root_flag" text;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD COLUMN "root_flag_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "session_milestones" ADD CONSTRAINT "session_milestones_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_milestones_training_session_id_index" ON "session_milestones" USING btree ("training_session_id");--> statement-breakpoint
CREATE INDEX "session_milestones_status_index" ON "session_milestones" USING btree ("status");--> statement-breakpoint
CREATE INDEX "training_sessions_mode_index" ON "training_sessions" USING btree ("mode");