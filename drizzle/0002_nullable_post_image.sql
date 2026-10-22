ALTER TABLE "posts" ALTER COLUMN "image_url" DROP NOT NULL;--> statement-breakpoint
UPDATE "posts" SET "image_url" = NULL WHERE "image_url" = '';
