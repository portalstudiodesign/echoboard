ALTER TABLE "post" ADD COLUMN "merged_into_id" uuid;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_merged_into_id_post_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."post"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_status_idx" ON "post" USING btree ("status");--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_not_merged_into_itself" CHECK ("post"."merged_into_id" <> "post"."id");