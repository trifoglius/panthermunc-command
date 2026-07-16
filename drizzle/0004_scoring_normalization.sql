CREATE TABLE "position_paper_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"committee_id" uuid NOT NULL,
	"delegate_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubric_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"committee_id" uuid NOT NULL,
	"role" text NOT NULL,
	"delegate_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rubric_scores_role_check" CHECK ("rubric_scores"."role" IN ('judge', 'dais'))
);
--> statement-breakpoint
ALTER TABLE "committees" ADD COLUMN "scoring_migrated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "position_paper_scores" ADD CONSTRAINT "position_paper_scores_committee_id_committees_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubric_scores" ADD CONSTRAINT "rubric_scores_committee_id_committees_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "position_paper_scores_unique_idx" ON "position_paper_scores" USING btree ("committee_id","delegate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rubric_scores_unique_idx" ON "rubric_scores" USING btree ("committee_id","role","delegate_id");