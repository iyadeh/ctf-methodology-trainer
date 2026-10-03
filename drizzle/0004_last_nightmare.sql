CREATE TYPE "public"."generation_run_status" AS ENUM('pending', 'parsing', 'extracting', 'graph_building', 'verifying', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "attack_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attack_graph_id" uuid NOT NULL,
	"source_node_key" varchar(255) NOT NULL,
	"target_node_key" varchar(255) NOT NULL,
	"dependency_type" varchar(32) DEFAULT 'hard' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attack_graphs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_run_id" uuid,
	"training_session_id" uuid,
	"machine_name" varchar(255) NOT NULL,
	"entry_node_ids_json" text NOT NULL,
	"terminal_node_ids_json" text NOT NULL,
	"reference_path_node_ids_json" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attack_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attack_graph_id" uuid NOT NULL,
	"node_key" varchar(255) NOT NULL,
	"semantic_key" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"phase" varchar(64) NOT NULL,
	"kind" varchar(64) NOT NULL,
	"spoiler_level" integer DEFAULT 0 NOT NULL,
	"is_entry_point" boolean DEFAULT false NOT NULL,
	"is_terminal" boolean DEFAULT false NOT NULL,
	"metadata_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"writeup_id" uuid,
	"training_session_id" uuid,
	"fingerprint" varchar(64) NOT NULL,
	"status" "generation_run_status" DEFAULT 'pending' NOT NULL,
	"current_step" varchar(64),
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"error" text,
	"facts_json" text,
	"metadata_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graph_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attack_graph_id" uuid NOT NULL,
	"status" varchar(32) NOT NULL,
	"confidence" integer NOT NULL,
	"missing_steps_json" text NOT NULL,
	"unsupported_steps_json" text NOT NULL,
	"conflicts_json" text NOT NULL,
	"checks_json" text NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machine_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_session_id" uuid NOT NULL,
	"generation_run_id" uuid,
	"name" varchar(255) NOT NULL,
	"platform" varchar(128) DEFAULT 'Unknown' NOT NULL,
	"os" varchar(64) DEFAULT 'unknown' NOT NULL,
	"difficulty" varchar(64) DEFAULT 'unknown' NOT NULL,
	"author" varchar(128),
	"target_ip" "inet",
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "machine_profiles_training_session_id_unique" UNIQUE("training_session_id")
);
--> statement-breakpoint
CREATE TABLE "writeups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" varchar(255) NOT NULL,
	"format" varchar(32) NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256_hash" varchar(64) NOT NULL,
	"character_count" integer NOT NULL,
	"word_count" integer NOT NULL,
	"page_count" integer,
	"normalized_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attack_edges" ADD CONSTRAINT "attack_edges_attack_graph_id_attack_graphs_id_fk" FOREIGN KEY ("attack_graph_id") REFERENCES "public"."attack_graphs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attack_graphs" ADD CONSTRAINT "attack_graphs_generation_run_id_generation_runs_id_fk" FOREIGN KEY ("generation_run_id") REFERENCES "public"."generation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attack_graphs" ADD CONSTRAINT "attack_graphs_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attack_nodes" ADD CONSTRAINT "attack_nodes_attack_graph_id_attack_graphs_id_fk" FOREIGN KEY ("attack_graph_id") REFERENCES "public"."attack_graphs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_writeup_id_writeups_id_fk" FOREIGN KEY ("writeup_id") REFERENCES "public"."writeups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graph_verifications" ADD CONSTRAINT "graph_verifications_attack_graph_id_attack_graphs_id_fk" FOREIGN KEY ("attack_graph_id") REFERENCES "public"."attack_graphs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_profiles" ADD CONSTRAINT "machine_profiles_training_session_id_training_sessions_id_fk" FOREIGN KEY ("training_session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_profiles" ADD CONSTRAINT "machine_profiles_generation_run_id_generation_runs_id_fk" FOREIGN KEY ("generation_run_id") REFERENCES "public"."generation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attack_edges_attack_graph_id_index" ON "attack_edges" USING btree ("attack_graph_id");--> statement-breakpoint
CREATE INDEX "attack_graphs_training_session_id_index" ON "attack_graphs" USING btree ("training_session_id");--> statement-breakpoint
CREATE INDEX "attack_graphs_generation_run_id_index" ON "attack_graphs" USING btree ("generation_run_id");--> statement-breakpoint
CREATE INDEX "attack_nodes_attack_graph_id_index" ON "attack_nodes" USING btree ("attack_graph_id");--> statement-breakpoint
CREATE INDEX "attack_nodes_node_key_index" ON "attack_nodes" USING btree ("node_key");--> statement-breakpoint
CREATE INDEX "generation_runs_fingerprint_index" ON "generation_runs" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "generation_runs_status_index" ON "generation_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "generation_runs_training_session_id_index" ON "generation_runs" USING btree ("training_session_id");--> statement-breakpoint
CREATE INDEX "graph_verifications_attack_graph_id_index" ON "graph_verifications" USING btree ("attack_graph_id");--> statement-breakpoint
CREATE INDEX "machine_profiles_generation_run_id_index" ON "machine_profiles" USING btree ("generation_run_id");--> statement-breakpoint
CREATE INDEX "writeups_sha256_hash_index" ON "writeups" USING btree ("sha256_hash");