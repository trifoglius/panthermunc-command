CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"committee_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"submission_number" integer,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "committees" ADD COLUMN "next_draft_submission_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_committee_id_committees_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_committee_idx" ON "documents" USING btree ("committee_id","created_at");