ALTER TABLE "posts" ADD COLUMN "edited_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "posts_owner_created_id_idx" ON "posts" USING btree ("owner_id","created","post_id");--> statement-breakpoint
CREATE INDEX "posts_created_id_idx" ON "posts" USING btree ("created","post_id");--> statement-breakpoint
DROP INDEX "posts_owner_created_idx";
