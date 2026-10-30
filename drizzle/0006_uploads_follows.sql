CREATE TABLE "follows" (
	"follower_id" uuid NOT NULL,
	"followee_id" uuid NOT NULL,
	"created" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_followee_id_pk" PRIMARY KEY("follower_id","followee_id"),
	CONSTRAINT "follows_no_self_follow" CHECK ("follows"."follower_id" <> "follows"."followee_id")
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"upload_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" varchar(32) NOT NULL,
	"size_bytes" integer,
	"width" integer,
	"height" integer,
	"created" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uploads_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "uploads_size_check" CHECK (("uploads"."width" is null) = ("uploads"."height" is null) and ("uploads"."width" is null or ("uploads"."width" > 0 and "uploads"."height" > 0)))
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "image_upload_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_upload_id" uuid;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_users_user_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_followee_id_users_user_id_fk" FOREIGN KEY ("followee_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_owner_id_users_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follows_followee_created_idx" ON "follows" USING btree ("followee_id","created","follower_id");--> statement-breakpoint
CREATE INDEX "follows_follower_created_idx" ON "follows" USING btree ("follower_id","created","followee_id");--> statement-breakpoint
CREATE INDEX "uploads_owner_id_idx" ON "uploads" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_image_upload_id_uploads_upload_id_fk" FOREIGN KEY ("image_upload_id") REFERENCES "public"."uploads"("upload_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_upload_id_uploads_upload_id_fk" FOREIGN KEY ("avatar_upload_id") REFERENCES "public"."uploads"("upload_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "posts_image_upload_id_idx" ON "posts" USING btree ("image_upload_id") WHERE "posts"."image_upload_id" is not null;--> statement-breakpoint
CREATE INDEX "users_avatar_upload_id_idx" ON "users" USING btree ("avatar_upload_id") WHERE "users"."avatar_upload_id" is not null;--> statement-breakpoint
INSERT INTO "uploads" ("owner_id", "storage_key", "content_type")
SELECT DISTINCT ON ("keys"."storage_key") "keys"."owner_id", "keys"."storage_key",
	CASE lower(substring("keys"."storage_key" from '\.([A-Za-z0-9]+)$'))
		WHEN 'png' THEN 'image/png'
		WHEN 'webp' THEN 'image/webp'
		WHEN 'gif' THEN 'image/gif'
		ELSE 'image/jpeg'
	END
FROM (
	SELECT "user_id" AS "owner_id", substring("image_url" from '(users/[0-9a-f-]{36}/[^/?#]+)$') AS "storage_key" FROM "users"
	UNION ALL
	SELECT "owner_id", substring("image_url" from '(users/[0-9a-f-]{36}/[^/?#]+)$') FROM "posts"
) AS "keys"
WHERE "keys"."storage_key" LIKE 'users/' || "keys"."owner_id" || '/%'
ORDER BY "keys"."storage_key";--> statement-breakpoint
UPDATE "users" SET "avatar_upload_id" = "uploads"."upload_id"
FROM "uploads"
WHERE "uploads"."storage_key" = substring("users"."image_url" from '(users/[0-9a-f-]{36}/[^/?#]+)$')
	AND "uploads"."owner_id" = "users"."user_id";--> statement-breakpoint
UPDATE "posts" SET "image_upload_id" = "uploads"."upload_id"
FROM "uploads"
WHERE "uploads"."storage_key" = substring("posts"."image_url" from '(users/[0-9a-f-]{36}/[^/?#]+)$')
	AND "uploads"."owner_id" = "posts"."owner_id";
