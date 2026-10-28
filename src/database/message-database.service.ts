import { Inject, Injectable } from '@nestjs/common';

import { DRIZZLE, type Database } from '@/database/drizzle';
import { Messages } from '@/database/schemas/messages.schema';

@Injectable()
export class MessageDatabaseService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async createMessage({
    chatId,
    senderId,
    content,
  }: {
    chatId: string;
    senderId: string;
    content: string;
  }) {
    const [message] = await this.db
      .insert(Messages)
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

    return message;
  }
}
