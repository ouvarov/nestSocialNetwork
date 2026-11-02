import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import { lockChats, handOverOwnership } from '@/database/chat-cleanup';
import { DRIZZLE, type Database, type Transaction } from '@/database/drizzle';
import {
  ChatMembers,
  type ChatRole,
} from '@/database/schemas/chatMembers.schema';
import { Chats, type ChatKind } from '@/database/schemas/chats.schema';
import { Users } from '@/database/schemas/users.schema';

type LockedMember = { userId: string; role: ChatRole };

type LockedChat = { kind: ChatKind; members: LockedMember[] };

class GroupEditor {
  constructor(
    private readonly tx: Transaction,
    private readonly chatId: string,
  ) {}

  async rename(title: string): Promise<void> {
    await this.tx
      .update(Chats)
      .set({ title })
      .where(eq(Chats.chat_id, this.chatId));
  }

  async countExistingUsers(userIds: string[]): Promise<number> {
    const users = await this.tx
      .select({ id: Users.user_id })
      .from(Users)
      .where(inArray(Users.user_id, userIds));

    return users.length;
  }

  async addMembers(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;

    await this.tx.insert(ChatMembers).values(
      userIds.map((userId) => ({
        chat_id: this.chatId,
        user_id: userId,
        cleared_at: sql`now()`,
      })),
    );
  }

  async removeMember(userId: string): Promise<void> {
    await this.tx
      .delete(ChatMembers)
      .where(
        and(
          eq(ChatMembers.chat_id, this.chatId),
          eq(ChatMembers.user_id, userId),
        ),
      );
  }

  async setRole(userId: string, role: ChatRole): Promise<void> {
    await this.tx
      .update(ChatMembers)
      .set({ role })
      .where(
        and(
          eq(ChatMembers.chat_id, this.chatId),
          eq(ChatMembers.user_id, userId),
        ),
      );
  }

  handOverOwnership(ownerId: string): Promise<void> {
    return handOverOwnership(this.tx, this.chatId, ownerId);
  }

  async deleteGroup(): Promise<void> {
    await this.tx.delete(Chats).where(eq(Chats.chat_id, this.chatId));
  }
}

@Injectable()
export class GroupChatDatabaseService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  createGroup(
    ownerId: string,
    title: string,
    memberIds: string[],
  ): Promise<string> {
    return this.db.transaction(async (tx) => {
      const [chat] = await tx
        .insert(Chats)
        .values({ kind: 'group', title })
        .returning({ chatId: Chats.chat_id });

      await tx.insert(ChatMembers).values([
        { chat_id: chat.chatId, user_id: ownerId, role: 'owner' as const },
        ...memberIds.map((userId) => ({
          chat_id: chat.chatId,
          user_id: userId,
        })),
      ]);

      return chat.chatId;
    });
  }

  countExistingUsers(userIds: string[]): Promise<number> {
    return this.db
      .select({ id: Users.user_id })
      .from(Users)
      .where(inArray(Users.user_id, userIds))
      .then((users) => users.length);
  }

  editChat<Result>(
    chatId: string,
    work: (chat: LockedChat | null, editor: GroupEditor) => Promise<Result>,
  ): Promise<Result> {
    return this.db.transaction(async (tx) => {
      await lockChats(tx, [chatId]);

      const [chat] = await tx
        .select({ kind: Chats.kind })
        .from(Chats)
        .where(eq(Chats.chat_id, chatId));
      const members = chat
        ? await tx
            .select({ userId: ChatMembers.user_id, role: ChatMembers.role })
            .from(ChatMembers)
            .where(eq(ChatMembers.chat_id, chatId))
            .orderBy(asc(ChatMembers.added_at), asc(ChatMembers.user_id))
        : [];

      return work(
        chat ? { kind: chat.kind, members } : null,
        new GroupEditor(tx, chatId),
      );
    });
  }
}

export type { GroupEditor, LockedChat, LockedMember };
