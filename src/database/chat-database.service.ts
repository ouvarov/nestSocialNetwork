import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.provider';

@Injectable()
export class ChatDatabaseService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createChat({ userIds }: { userIds: string[] }): Promise<string> {
    const userIdsSorted = userIds.sort();

    const existingChatResult = await this.databaseService.query(
      `SELECT cm.chat_id
       FROM ChatMembers cm
       WHERE cm.user_id = ANY($1)
       GROUP BY cm.chat_id
       HAVING COUNT(cm.user_id) = $2`, // Чат, содержащий всех указанных пользователей
      [userIdsSorted, userIdsSorted.length],
    );

    if (existingChatResult.rows.length > 0) {
      return existingChatResult.rows[0].chat_id;
    }

    // Создаем новый чат
    const createChatResult = await this.databaseService.query(
      `INSERT INTO Chats (created_at)
       VALUES (NOW())
       RETURNING chat_id`,
      [],
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
}
