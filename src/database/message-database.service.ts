import { Inject, Injectable } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import { Messages } from '@/database/schemas/messages.schema';

@Injectable()
export class MessageDatabaseService {
  constructor(
    @Inject('DRIZZLE_ORM')
    private readonly Drizzle: ReturnType<typeof drizzle>,
  ) {}

  async createMessage({
    chatId,
    senderId,
    content,
  }: {
    chatId: string;
    senderId: string;
    content: string;
  }) {
    const [message] = await this.Drizzle.insert(Messages)
      .values({
        chat_id: chatId,
        sender_id: senderId,
        content,
      })
      .returning({
        messageId: Messages.message_id,
        chatId: Messages.chat_id,
        senderId: Messages.sender_id,
        content: Messages.content,
        sentAt: Messages.sent_at,
      });

    if (!message) {
      throw new Error('Message creation failed');
    }

    return {
      chat_id: message.chatId,
      content: message.content,
      message_id: message.messageId,
      sender_id: message.senderId,
      sent_at: message.sentAt,
    };
  }
}
