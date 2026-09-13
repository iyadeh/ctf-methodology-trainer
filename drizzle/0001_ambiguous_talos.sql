ALTER TABLE "session_checks" ADD COLUMN "sort_order" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "session_checks" ADD CONSTRAINT "session_checks_phase_sort_order_unique" UNIQUE("session_phase_id","sort_order");--> statement-breakpoint
ALTER TABLE "session_checks" ADD CONSTRAINT "session_checks_sort_order_nonnegative" CHECK ("session_checks"."sort_order" >= 0);