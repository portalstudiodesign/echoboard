ALTER TABLE "subscription" ADD COLUMN "cancel_at" timestamp with time zone;--> statement-breakpoint
-- Carry over cancellations recorded the old way before the flag is dropped.
UPDATE "subscription" SET "cancel_at" = "current_period_end" WHERE "cancel_at_period_end" AND "cancel_at" IS NULL;
