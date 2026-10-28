ALTER TABLE "chat_members" ADD COLUMN "cleared_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "kind" text DEFAULT 'direct' NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "pair_key" text;--> statement-breakpoint
UPDATE "chats" SET "pair_key" = "pairs"."pair_key"
FROM (
	SELECT "chat_id", array_to_string(array_agg("user_id" ORDER BY "user_id"), ':') AS "pair_key"
	FROM "chat_members"
	GROUP BY "chat_id"
	HAVING count(*) = 2
) AS "pairs"
WHERE "chats"."chat_id" = "pairs"."chat_id";--> statement-breakpoint
CREATE UNIQUE INDEX "chats_direct_pair_key_uq" ON "chats" USING btree ("pair_key") WHERE "chats"."kind" = 'direct';--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_kind_check" CHECK ("chats"."kind" in ('direct'));--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_direct_pair_key_check" CHECK ("chats"."kind" <> 'direct' or "chats"."pair_key" is not null);--> statement-breakpoint
ALTER TABLE "chats" DROP COLUMN "chat_name";