import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ChatDatabaseService } from '@/database/chat-database.service';

import { UpdateChatDto } from './dto/update-chat.dto';

const MIN_CHAT_MEMBERS = 2;

@Injectable()
export class ChatService {
  constructor(private readonly chatDatabaseService: ChatDatabaseService) {}

  async create(userId: string, userIds: string[]): Promise<string> {
    const memberIds = [...new Set([userId, ...userIds])];

    if (memberIds.length < MIN_CHAT_MEMBERS) {
      throw new BadRequestException('A chat needs at least one other member');
    }

    const existingChatId =
      await this.chatDatabaseService.findChatWithExactMembers(memberIds);

    return existingChatId ?? this.chatDatabaseService.createChat(memberIds);
  }

  findAll(userId: string) {
    return this.chatDatabaseService.getChatsOfUser(userId);
  }

  async findOne(userId: string, chatId: string) {
    await this.assertMember(userId, chatId);

    const chat = await this.chatDatabaseService.getChatWithMessages(chatId);
    if (!chat) throw new NotFoundException('Chat not found');

    return chat;
  }

  async deleteChat(userId: string, chatId: string): Promise<string> {
    await this.assertMember(userId, chatId);

    const deletedChatId = await this.chatDatabaseService.deleteChat(chatId);
    if (!deletedChatId) throw new NotFoundException('Chat not found');

    return deletedChatId;
  }

  async updateChatName(userId: string, { chatId, newChatName }: UpdateChatDto) {
    await this.assertMember(userId, chatId);

    const chat = await this.chatDatabaseService.updateChatName(
      chatId,
      newChatName,
    );
    if (!chat) throw new NotFoundException('Chat not found');

    return chat;
  }

  private async assertMember(userId: string, chatId: string): Promise<void> {
    const isMember = await this.chatDatabaseService.isMember(chatId, userId);

    if (!isMember) throw new NotFoundException('Chat not found');
  }
}
