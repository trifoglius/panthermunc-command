ALTER TABLE "users" DROP CONSTRAINT "role_check";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "permissions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "users" SET "permissions" = '["conference:manage","users:manage","committee:access_all","committee:operate","scoring:edit","notifications:send","export:all"]'::jsonb WHERE "role" = 'admin';--> statement-breakpoint
UPDATE "users" SET "permissions" = '["committee:operate","scoring:edit"]'::jsonb WHERE "role" = 'chair';--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "role_check" CHECK ("users"."role" IN ('admin', 'chair', 'registrar', 'custom'));
