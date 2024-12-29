import { Inject, Injectable } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, inArray, sql } from 'drizzle-orm';

import { ChatMembers } from '@/database/schemas/chatMembers.schema';
import { Users } from '@/database/schemas/users.schema';
import { Chats } from '@/database/schemas/chats.schema';
import { Messages } from '@/database/schemas/messages.schema';

@Injectable()
export class ChatDatabaseService {
  constructor(
    @Inject('DRIZZLE_ORM')
    private readonly Drizzle: ReturnType<typeof drizzle>,
  ) {}

  async createChat({ userIds }: { userIds: string[] }): Promise<string> {
    const userIdsSorted = userIds.sort();

    const existingChat = await this.Drizzle.select({
      chatId: ChatMembers.chat_id,
    })
      .from(ChatMembers)
      .where(inArray(ChatMembers.user_id, userIdsSorted))
      .groupBy(ChatMembers.chat_id)
      .having(sql`COUNT(${ChatMembers.user_id}) = ${userIdsSorted.length}`)
      .limit(1);

    if (existingChat.length > 0) {
      return existingChat[0].chatId;
    }

    const users = await this.Drizzle.select({ user_name: Users.user_name })
      .from(Users)
      .where(inArray(Users.user_id, userIdsSorted));

    const userNames = users.map((row) => row.user_name);
    const chatName = userNames.join(', ');

    const [newChat] = await this.Drizzle.insert(Chats)
      .values({
        chatName,
        createdAt: new Date(),
      })
      .returning();

    const insertMembers = userIdsSorted.map((userId) =>
      this.Drizzle.insert(ChatMembers).values({
        chat_id: newChat.chat_id,
        user_id: userId,
      }),
    );

    await Promise.all(insertMembers);

    return newChat.chat_id;
  }

  async getChatWithMessages(id: string) {
    const result = await this.Drizzle.select({
      chatId: Chats.chat_id,
      chatName: Chats.chat_name,
      chatCreatedAt: Chats.created_at,
      messageId: Messages.message_id,
      senderId: Messages.sender_id,
      content: Messages.content,
      sentAt: Messages.sent_at,
    })
      .from(Chats)
      .leftJoin(Messages, eq(Chats.chat_id, Messages.chat_id))
      .where(eq(Chats.chat_id, id))
      .orderBy(Messages.sent_at);

    const messages = result.filter((row) => row.messageId !== null);

    return {
      chatName: result[0]?.chatName || '',
      messages: messages.length > 0 ? messages : [],
    };
  }

  async deleteChat(chatId: string): Promise<string> {
    const result = await this.Drizzle.delete(Chats)
      .where(eq(Chats.chat_id, chatId))
      .returning({ chatId: Chats.chat_id });

    if (result.length === 0) {
      throw new Error(`Chat with ID ${chatId} does not exist.`);
    }

    return result[0].chatId;
  }

  async updateChatName({
    chatId,
    newChatName,
  }: {
    chatId: string;
    newChatName: string;
  }): Promise<{ chatId: string; chatName: string }> {
    const result = await this.Drizzle.update(Chats)
      .set({ chatName: newChatName })
      .where(eq(Chats.chat_id, chatId))
      .returning({ chatId: Chats.chat_id, chatName: Chats.chat_name });

    if (result.length === 0) {
      throw new Error(`Chat with ID ${chatId} does not exist.`);
    }

    return result[0];
  }

  async getAllChats(): Promise<{ chatId: string; chatName: string }[]> {
    const result = await this.Drizzle.select({
      chatId: Chats.chat_id,
      chatName: Chats.chat_name,
    })
      .from(Chats)
      .orderBy(sql`${Chats.created_at} DESC`);

    return result;
  }
}
