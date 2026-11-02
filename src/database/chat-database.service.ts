import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gt, isNull, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import type { Cursor } from '@/common/pagination/cursor';
import { deleteChatsNobodySees, lockChats } from '@/database/chat-cleanup';
import { DRIZZLE, type Database } from '@/database/drizzle';
import {
  ChatMembers,
  type ChatRole,
} from '@/database/schemas/chatMembers.schema';
import { Chats, type ChatKind } from '@/database/schemas/chats.schema';
import { Messages } from '@/database/schemas/messages.schema';
import { Uploads } from '@/database/schemas/uploads.schema';
import { Users } from '@/database/schemas/users.schema';
import type { StoredImage } from '@/storage/image-url';

type ChatPeer = StoredImage & { id: string; userName: string };

type ChatMemberRow = ChatPeer & { role: ChatRole };

type LastMessage = {
  content: string;
  senderId: string | null;
  senderName: string | null;
  sentAt: Date;
};

type LastMessageRow = Omit<LastMessage, 'sentAt'> & { sentAt: string };

type ChatSummary = {
  chatId: string;
  kind: ChatKind;
  title: string | null;
  memberCount: number;
  peer: ChatPeer | null;
  lastMessageAt: Date | null;
  lastMessage: LastMessage | null;
  unreadCount: number;
};

type ChatHeader = {
  chatId: string;
  kind: ChatKind;
  title: string | null;
  myRole: ChatRole;
  peer: ChatPeer | null;
};

type MessageRow = {
  messageId: string;
  senderId: string | null;
  senderName: string | null;
  content: string;
  sentAt: Date;
  sentCursor: string;
};

const PeerMembers = alias(ChatMembers, 'peer_members');

const lastMessageAt =
  sql<Date | null>`(select max(${Messages.sent_at}) from ${Messages} where ${Messages.chat_id} = ${Chats.chat_id})`.mapWith(
    Messages.sent_at,
  );

const PREVIEW_LENGTH = 200;

const latestMessage = sql<LastMessageRow | null>`(
  select json_build_object(
    'content', left(latest.content, ${PREVIEW_LENGTH}),
    'senderId', latest.sender_id,
    'senderName', (select ${Users.user_name} from ${Users} where ${Users.user_id} = latest.sender_id),
    'sentAt', latest.sent_at
  )
  from ${Messages} latest
  where latest.chat_id = ${Chats}.chat_id
    and latest.sent_at > coalesce(${ChatMembers}.cleared_at, '-infinity'::timestamptz)
  order by latest.sent_at desc, latest.message_id desc
  limit 1
)`;

const memberCount = sql<number>`(
  select count(*)::int
  from ${ChatMembers} everyone
  where everyone.chat_id = ${Chats}.chat_id
)`;

const unreadCount = (userId: string) =>
  sql<number>`(
    select count(*)::int
    from ${Messages} unread
    where unread.chat_id = ${Chats}.chat_id
      and unread.sender_id is distinct from ${userId}
      and unread.sent_at > coalesce(greatest(${ChatMembers}.last_read_at, ${ChatMembers}.cleared_at), '-infinity'::timestamptz)
  )`;

const readUpToMessage = (chatId: string, messageId: string) =>
  sql`greatest(${ChatMembers.last_read_at}, (
    select read_up_to.sent_at
    from ${Messages} read_up_to
    where read_up_to.message_id = ${messageId}
      and read_up_to.chat_id = ${chatId}
  ))`;

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

  async findChatKind(chatId: string): Promise<ChatKind | null> {
    const [chat] = await this.db
      .select({ kind: Chats.kind })
      .from(Chats)
      .where(eq(Chats.chat_id, chatId));

    return chat?.kind ?? null;
  }

  async findMembers(chatId: string): Promise<ChatMemberRow[]> {
    const members = await this.db
      .select({ ...peerColumns, role: ChatMembers.role })
      .from(ChatMembers)
      .innerJoin(Users, eq(Users.user_id, ChatMembers.user_id))
      .leftJoin(Uploads, eq(Uploads.upload_id, Users.avatar_upload_id))
      .where(eq(ChatMembers.chat_id, chatId))
      .orderBy(asc(ChatMembers.added_at), asc(ChatMembers.user_id));

    return members;
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
      .select({
        chatId: Chats.chat_id,
        kind: Chats.kind,
        title: Chats.title,
        memberCount,
        peer: peerColumns,
        lastMessage: latestMessage,
        unreadCount: unreadCount(userId),
      })
      .from(ChatMembers)
      .innerJoin(Chats, eq(Chats.chat_id, ChatMembers.chat_id))
      .leftJoin(
        PeerMembers,
        and(
          eq(PeerMembers.chat_id, ChatMembers.chat_id),
          ne(PeerMembers.user_id, ChatMembers.user_id),
          eq(Chats.kind, 'direct'),
        ),
      )
      .leftJoin(Users, eq(Users.user_id, PeerMembers.user_id))
      .leftJoin(Uploads, eq(Uploads.upload_id, Users.avatar_upload_id))
      .where(
        and(
          eq(ChatMembers.user_id, userId),
          or(
            eq(Chats.kind, 'group'),
            isNull(ChatMembers.cleared_at),
            gt(lastMessageAt, ChatMembers.cleared_at),
          ),
        ),
      )
      .orderBy(
        desc(
          sql`greatest(coalesce(${lastMessageAt}, ${Chats.created_at}), ${ChatMembers.cleared_at})`,
        ),
        desc(Chats.chat_id),
      );

    return chats.map((chat) => {
      const sentAt = chat.lastMessage && new Date(chat.lastMessage.sentAt);

      return {
        ...chat,
        peer: toChatPeer(chat.peer),
        lastMessageAt: sentAt,
        lastMessage: chat.lastMessage &&
          sentAt && { ...chat.lastMessage, sentAt },
      };
    });
  }

  async markRead(
    chatId: string,
    userId: string,
    upToMessageId?: string,
  ): Promise<boolean> {
    const updated = await this.db
      .update(ChatMembers)
      .set({
        last_read_at: upToMessageId
          ? readUpToMessage(chatId, upToMessageId)
          : sql`now()`,
      })
      .where(
        and(eq(ChatMembers.chat_id, chatId), eq(ChatMembers.user_id, userId)),
      )
      .returning({ chatId: ChatMembers.chat_id });

    return updated.length > 0;
  }

  async findChatHeader(
    chatId: string,
    userId: string,
  ): Promise<ChatHeader | null> {
    const [chat] = await this.db
      .select({
        chatId: ChatMembers.chat_id,
        kind: Chats.kind,
        title: Chats.title,
        myRole: ChatMembers.role,
        peer: peerColumns,
      })
      .from(ChatMembers)
      .innerJoin(Chats, eq(Chats.chat_id, ChatMembers.chat_id))
      .leftJoin(
        PeerMembers,
        and(
          eq(PeerMembers.chat_id, ChatMembers.chat_id),
          ne(PeerMembers.user_id, ChatMembers.user_id),
          eq(Chats.kind, 'direct'),
        ),
      )
      .leftJoin(Users, eq(Users.user_id, PeerMembers.user_id))
      .leftJoin(Uploads, eq(Uploads.upload_id, Users.avatar_upload_id))
      .where(
        and(eq(ChatMembers.chat_id, chatId), eq(ChatMembers.user_id, userId)),
      );

    return chat ? { ...chat, peer: toChatPeer(chat.peer) } : null;
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
        senderName: Users.user_name,
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
      .leftJoin(Users, eq(Users.user_id, Messages.sender_id))
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

export type { ChatHeader, ChatMemberRow, ChatPeer, ChatSummary, MessageRow };
