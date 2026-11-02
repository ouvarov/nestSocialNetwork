ALTER TABLE "chats" DROP CONSTRAINT "chats_kind_check";--> statement-breakpoint
ALTER TABLE "chat_members" ADD COLUMN "role" text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "title" text;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_members_one_owner_uq" ON "chat_members" USING btree ("chat_id") WHERE "chat_members"."role" = 'owner';--> statement-breakpoint
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_role_check" CHECK ("chat_members"."role" in ('owner', 'moderator', 'member'));--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_shape_check" CHECK (("chats"."kind" = 'direct' and "chats"."title" is null) or ("chats"."kind" = 'group' and "chats"."pair_key" is null and "chats"."title" is not null and char_length("chats"."title") between 1 and 100));--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_kind_check" CHECK ("chats"."kind" in ('direct', 'group'));