import { Inject, Injectable } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { ChatMembers } from '@/database/schemas/chatMembers.schema';
import { Users } from '@/database/schemas/users.schema';
import { Chats } from '@/database/schemas/chats.schema';
import { Messages } from '@/database/schemas/messages.schema';

type ChatSummary = { chatId: string; chatName: string | null };

@Injectable()
export class ChatDatabaseService {
  constructor(
    @Inject('DRIZZLE_ORM')
    private readonly Drizzle: ReturnType<typeof drizzle>,
  ) {}

  async isMember(chatId: string, userId: string): Promise<boolean> {
    const [member] = await this.Drizzle.select({ chatId: ChatMembers.chat_id })
      .from(ChatMembers)
      .where(
        and(eq(ChatMembers.chat_id, chatId), eq(ChatMembers.user_id, userId)),
      )
      .limit(1);

    return member !== undefined;
  }

  async findChatWithExactMembers(memberIds: string[]): Promise<string | null> {
    const [creatorId] = memberIds;
    const chatsOfCreator = this.Drizzle.select({ chatId: ChatMembers.chat_id })
      .from(ChatMembers)
      .where(eq(ChatMembers.user_id, creatorId));

    const [chat] = await this.Drizzle.select({ chatId: ChatMembers.chat_id })
      .from(ChatMembers)
      .where(inArray(ChatMembers.chat_id, chatsOfCreator))
      .groupBy(ChatMembers.chat_id)
      .having(
        and(
          sql`count(*) = ${memberIds.length}`,
          sql`count(*) filter (where ${inArray(ChatMembers.user_id, memberIds)}) = ${memberIds.length}`,
        ),
      )
      .limit(1);

    return chat?.chatId ?? null;
  }

  async createChat(memberIds: string[]): Promise<string> {
    const members = await this.Drizzle.select({ userName: Users.user_name })
      .from(Users)
      .where(inArray(Users.user_id, memberIds))
      .orderBy(Users.user_name);
    const chatName = members.map(({ userName }) => userName).join(', ');

    return this.Drizzle.transaction(async (tx) => {
      const [chat] = await tx
        .insert(Chats)
        .values({ chat_name: chatName })
        .returning({ chatId: Chats.chat_id });

      await tx.insert(ChatMembers).values(
        memberIds.map((userId) => ({
          chat_id: chat.chatId,
          user_id: userId,
        })),
      );

      return chat.chatId;
    });
  }

  async getChatsOfUser(userId: string): Promise<ChatSummary[]> {
    return this.Drizzle.select({
      chatId: Chats.chat_id,
      chatName: Chats.chat_name,
    })
      .from(Chats)
      .innerJoin(ChatMembers, eq(ChatMembers.chat_id, Chats.chat_id))
      .where(eq(ChatMembers.user_id, userId))
      .orderBy(desc(Chats.created_at));
  }

  async getChatWithMessages(chatId: string) {
    const [chat] = await this.Drizzle.select({ chatName: Chats.chat_name })
      .from(Chats)
      .where(eq(Chats.chat_id, chatId));

    if (!chat) return null;

    const messages = await this.Drizzle.select({
      messageId: Messages.message_id,
      senderId: Messages.sender_id,
      content: Messages.content,
      sentAt: Messages.sent_at,
    })
      .from(Messages)
      .where(eq(Messages.chat_id, chatId))
      .orderBy(Messages.sent_at);

    return { chatName: chat.chatName ?? '', messages };
  }

  async deleteChat(chatId: string): Promise<string | null> {
    const [chat] = await this.Drizzle.delete(Chats)
      .where(eq(Chats.chat_id, chatId))
      .returning({ chatId: Chats.chat_id });

    return chat?.chatId ?? null;
  }

  async updateChatName(
    chatId: string,
    chatName: string,
  ): Promise<ChatSummary | null> {
    const [chat] = await this.Drizzle.update(Chats)
      .set({ chat_name: chatName })
      .where(eq(Chats.chat_id, chatId))
      .returning({ chatId: Chats.chat_id, chatName: Chats.chat_name });

    return chat ?? null;
  }
}
