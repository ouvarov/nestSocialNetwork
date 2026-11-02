ALTER TABLE "chat_members" ADD COLUMN "last_read_at" timestamp with time zone;--> statement-breakpoint
UPDATE "chat_members" SET "last_read_at" = now();
