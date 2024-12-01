import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.provider';

@Injectable()
export class ChatDatabaseService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createChat({ userIds }: { userIds: string[] }): Promise<string> {
    console.log(userIds);
    const userIdsSorted = userIds.sort();

    const existingChatResult = await this.databaseService.query(
      `SELECT cm.chat_id
     FROM ChatMembers cm
     WHERE cm.user_id = ANY($1)
     GROUP BY cm.chat_id
     HAVING COUNT(cm.user_id) = $2`,
      [userIdsSorted, userIdsSorted.length],
    );

    if (existingChatResult.rows.length > 0) {
      return existingChatResult.rows[0].chat_id;
    }

    const usersResult = await this.databaseService.query(
      `SELECT user_name 
     FROM Users 
     WHERE user_id = ANY($1)`,
      [userIdsSorted],
    );

    const userNames = usersResult.rows.map((row) => row.user_name);
    const chatName = userNames.join(', ');

    const createChatResult = await this.databaseService.query(
      `INSERT INTO Chats (chat_name, created_at)
     VALUES ($1, NOW())
     RETURNING chat_id`,
      [chatName],
    );

    const newChatId = createChatResult.rows[0].chat_id;

    const insertMembersPromises = userIdsSorted.map((userId) =>
      this.databaseService.query(
        `INSERT INTO ChatMembers (chat_id, user_id, added_at)
       VALUES ($1, $2, NOW())`,
        [newChatId, userId],
      ),
    );

    await Promise.all(insertMembersPromises);

    return newChatId;
  }

  async getChatWithMessages(chatId: string) {
    const query = `
    SELECT 
        c.chat_id,
        c.created_at AS chat_created_at,
        c.chat_name,  -- Добавляем chat_name в запрос
        m.message_id,
        m.sender_id,
        m.content,
        m.sent_at
    FROM 
        Chats c
    LEFT JOIN 
        Messages m
    ON 
        c.chat_id = m.chat_id
    WHERE 
        c.chat_id = $1
    ORDER BY 
        m.sent_at ASC;
  `;

    const result = await this.databaseService.query(query, [chatId]);

    const messages = result.rows.filter((row) => row.message_id !== null);

    return {
      chatName: result.rows[0]?.chat_name || '',
      messages: messages.length > 0 ? messages : [],
    };
  }

  async deleteChat(chatId: string): Promise<void> {
    const query = `
    DELETE FROM Chats
    WHERE chat_id = $1
    RETURNING chat_id;
  `;

    const result = await this.databaseService.query(query, [chatId]);

    if (result.rowCount === 0) {
      throw new Error(`Chat with ID ${chatId} does not exist.`);
    }

    return result;
  }

  async updateChatName({
    chatId,
    newChatName,
  }: {
    chatId: string;
    newChatName: string;
  }): Promise<void> {
    const query = `
    UPDATE Chats
    SET chat_name = $1
    WHERE chat_id = $2
    RETURNING chat_id, chat_name;
  `;

    const result = await this.databaseService.query(query, [
      newChatName,
      chatId,
    ]);

    if (result.rowCount === 0) {
      throw new Error(`Chat with ID ${chatId} does not exist.`);
    }

    return result;
  }

  async getAllChats(): Promise<{ chat_id: string; chat_name: string }[]> {
    const query = `
    SELECT 
        chat_id,
        chat_name
    FROM 
        Chats
    ORDER BY 
        created_at DESC;
  `;

    const result = await this.databaseService.query(query);

    return result.rows;
  }
}
