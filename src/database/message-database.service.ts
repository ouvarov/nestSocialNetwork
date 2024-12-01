import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.provider';

@Injectable()
export class MessageDatabaseService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createMessage({
    chatId,
    senderId,
    content,
  }: {
    chatId: string;
    senderId: string;
    content: string;
  }) {
    const query = `
    INSERT INTO Messages (chat_id, sender_id, content, sent_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING message_id, chat_id, sender_id, content, sent_at;
  `;

    const result = await this.databaseService.query(query, [
      chatId,
      senderId,
      content,
    ]);

    if (result.rows.length === 0) {
      throw new Error('Message creation failed');
    }

    const message = result.rows[0];

    return {
      chat_id: message.chat_id,
      content: message.content,
      message_id: message.message_id,
      sender_id: message.sender_id,
      sent_at: message.sent_at,
    };
  }
}
