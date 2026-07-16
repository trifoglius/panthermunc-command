CREATE TABLE "delegates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"committee_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "motion_queue_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"committee_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "motions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"committee_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"session_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "points" (
	"id" uuid PRIMARY KEY NOT NULL,
	"committee_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roll_call_attendance_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"delegate_id" text NOT NULL,
	"status" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by" uuid
);
--> statement-breakpoint
CREATE TABLE "roll_call_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"committee_id" uuid NOT NULL,
	"label" text NOT NULL,
	"timestamp" text NOT NULL,
	"quorum_met" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "speaking_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"committee_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "committees" ADD COLUMN "floor_migrated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "delegates" ADD CONSTRAINT "delegates_committee_id_committees_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "motion_queue_history" ADD CONSTRAINT "motion_queue_history_committee_id_committees_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "motions" ADD CONSTRAINT "motions_committee_id_committees_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points" ADD CONSTRAINT "points_committee_id_committees_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roll_call_attendance_events" ADD CONSTRAINT "roll_call_attendance_events_session_id_roll_call_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."roll_call_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roll_call_sessions" ADD CONSTRAINT "roll_call_sessions_committee_id_committees_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaking_events" ADD CONSTRAINT "speaking_events_committee_id_committees_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delegates_committee_idx" ON "delegates" USING btree ("committee_id","created_at");--> statement-breakpoint
CREATE INDEX "motion_queue_history_committee_idx" ON "motion_queue_history" USING btree ("committee_id","created_at");--> statement-breakpoint
CREATE INDEX "motions_committee_idx" ON "motions" USING btree ("committee_id","created_at");--> statement-breakpoint
CREATE INDEX "points_committee_idx" ON "points" USING btree ("committee_id","created_at");--> statement-breakpoint
CREATE INDEX "roll_call_attendance_lookup_idx" ON "roll_call_attendance_events" USING btree ("session_id","delegate_id","recorded_at");--> statement-breakpoint
CREATE INDEX "roll_call_sessions_committee_idx" ON "roll_call_sessions" USING btree ("committee_id","created_at");--> statement-breakpoint
CREATE INDEX "speaking_events_committee_idx" ON "speaking_events" USING btree ("committee_id","created_at");