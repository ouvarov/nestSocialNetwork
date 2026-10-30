import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { Cursor } from '@/common/pagination/cursor';
import { deleteChatsNobodySees, lockChats } from '@/database/chat-cleanup';
import { DRIZZLE, type Database } from '@/database/drizzle';
import { ChatMembers } from '@/database/schemas/chatMembers.schema';
import { Chats } from '@/database/schemas/chats.schema';
import { Messages } from '@/database/schemas/messages.schema';
import { Uploads } from '@/database/schemas/uploads.schema';
import { Users } from '@/database/schemas/users.schema';
import type { StoredImage } from '@/storage/image-url';

type ChatPeer = StoredImage & { id: string; userName: string };

type ChatSummary = {
  chatId: string;
  peer: ChatPeer | null;
  lastMessageAt: Date | null;
};

type ChatHeader = { chatId: string; peer: ChatPeer | null };

type MessageRow = {
  messageId: string;
  senderId: string | null;
  content: string;
  sentAt: Date;
  sentCursor: string;
};

const PeerMembers = alias(ChatMembers, 'peer_members');

const lastMessageAt =
  sql<Date | null>`(select max(${Messages.sent_at}) from ${Messages} where ${Messages.chat_id} = ${Chats.chat_id})`.mapWith(
    Messages.sent_at,
  );

const peerColumns = {
  id: Users.user_id,
  userName: Users.user_name,
  imageKey: Uploads.storage_key,
  legacyImageUrl: Users.image_url,
};

type PeerColumns =
  | {
      [Key in keyof ChatPeer]: ChatPeer[Key] | null;
    }
  | null;

const toChatPeer = (peer: PeerColumns): ChatPeer | null =>
  peer?.id && peer.userName !== null
    ? {
        id: peer.id,
        userName: peer.userName,
        imageKey: peer.imageKey,
        legacyImageUrl: peer.legacyImageUrl,
      }
    : null;

const toPairKey = (userId: string, peerId: string) =>
  [userId, peerId]
    .map((id) => id.toLowerCase())
    .sort()
    .join(':');

@Injectable()
export class ChatDatabaseService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async isMember(chatId: string, userId: string): Promise<boolean> {
    const [member] = await this.db
      .select({ chatId: ChatMembers.chat_id })
      .from(ChatMembers)
      .where(
        and(eq(ChatMembers.chat_id, chatId), eq(ChatMembers.user_id, userId)),
      )
      .limit(1);

    return member !== undefined;
  }

  async findMemberIds(chatId: string): Promise<string[]> {
    const members = await this.db
      .select({ userId: ChatMembers.user_id })
      .from(ChatMembers)
      .where(eq(ChatMembers.chat_id, chatId));

    return members.map(({ userId }) => userId);
  }

  findOrCreateDirectChat(userId: string, peerId: string): Promise<string> {
    const pairKey = toPairKey(userId, peerId);

    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(Chats)
        .values({ kind: 'direct', pair_key: pairKey })
        .onConflictDoNothing()
        .returning({ chatId: Chats.chat_id });

      if (created) {
        await tx.insert(ChatMembers).values([
          { chat_id: created.chatId, user_id: userId },
          { chat_id: created.chatId, user_id: peerId },
        ]);
        return created.chatId;
      }

      const [existing] = await tx
        .select({ chatId: Chats.chat_id })
        .from(Chats)
        .where(and(eq(Chats.kind, 'direct'), eq(Chats.pair_key, pairKey)));

      return existing.chatId;
    });
  }

  async getChatsOfUser(userId: string): Promise<ChatSummary[]> {
    const chats = await this.db
      .select({ chatId: Chats.chat_id, peer: peerColumns, lastMessageAt })
      .from(ChatMembers)
      .innerJoin(Chats, eq(Chats.chat_id, ChatMembers.chat_id))
      .leftJoin(
        PeerMembers,
        and(
          eq(PeerMembers.chat_id, ChatMembers.chat_id),
          ne(PeerMembers.user_id, ChatMembers.user_id),
        ),
      )
      .leftJoin(Users, eq(Users.user_id, PeerMembers.user_id))
      .leftJoin(Uploads, eq(Uploads.upload_id, Users.avatar_upload_id))
      .where(
        and(
          eq(ChatMembers.user_id, userId),
          or(
            isNull(ChatMembers.cleared_at),
            gt(lastMessageAt, ChatMembers.cleared_at),
          ),
        ),
      )
      .orderBy(
        desc(sql`coalesce(${lastMessageAt}, ${Chats.created_at})`),
        desc(Chats.chat_id),
      );

    return chats.map((chat) => ({ ...chat, peer: toChatPeer(chat.peer) }));
  }

  async findChatHeader(
    chatId: string,
    userId: string,
  ): Promise<ChatHeader | null> {
    const [chat] = await this.db
      .select({ chatId: ChatMembers.chat_id, peer: peerColumns })
      .from(ChatMembers)
      .leftJoin(
        PeerMembers,
        and(
          eq(PeerMembers.chat_id, ChatMembers.chat_id),
          ne(PeerMembers.user_id, ChatMembers.user_id),
        ),
      )
      .leftJoin(Users, eq(Users.user_id, PeerMembers.user_id))
      .leftJoin(Uploads, eq(Uploads.upload_id, Users.avatar_upload_id))
      .where(
        and(eq(ChatMembers.chat_id, chatId), eq(ChatMembers.user_id, userId)),
      );

    return chat ? { chatId: chat.chatId, peer: toChatPeer(chat.peer) } : null;
  }

  findMessages({
    chatId,
    userId,
    limit,
    cursor,
  }: {
    chatId: string;
    userId: string;
    limit: number;
    cursor?: Cursor;
  }): Promise<MessageRow[]> {
    const isBeforeCursor = cursor
      ? sql`(${Messages.sent_at}, ${Messages.message_id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
      : undefined;

    return this.db
      .select({
        messageId: Messages.message_id,
        senderId: Messages.sender_id,
        content: Messages.content,
        sentAt: Messages.sent_at,
        sentCursor: sql<string>`${Messages.sent_at}::text`,
      })
      .from(Messages)
      .innerJoin(
        ChatMembers,
        and(
          eq(ChatMembers.chat_id, Messages.chat_id),
          eq(ChatMembers.user_id, userId),
        ),
      )
      .where(
        and(
          eq(Messages.chat_id, chatId),
          or(
            isNull(ChatMembers.cleared_at),
            gt(Messages.sent_at, ChatMembers.cleared_at),
          ),
          isBeforeCursor,
        ),
      )
      .orderBy(desc(Messages.sent_at), desc(Messages.message_id))
      .limit(limit + 1);
  }

  clearChat(chatId: string, userId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      await lockChats(tx, [chatId]);

      const cleared = await tx
        .update(ChatMembers)
        .set({ cleared_at: sql`now()` })
        .where(
          and(eq(ChatMembers.chat_id, chatId), eq(ChatMembers.user_id, userId)),
        )
        .returning({ chatId: ChatMembers.chat_id });

      if (cleared.length === 0) return false;

      await deleteChatsNobodySees(tx, [chatId]);
      return true;
    });
  }
}

export type { ChatHeader, ChatPeer, ChatSummary, MessageRow };
