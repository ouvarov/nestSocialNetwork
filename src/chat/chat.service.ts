import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { decodeCursor, toPage } from '@/common/pagination/cursor';
import type { PageQueryDto } from '@/common/pagination/page-query.dto';
import {
  ChatDatabaseService,
  type MessageRow,
} from '@/database/chat-database.service';
import { UserService } from '@/user/user.service';

import type {
  ChatDto,
  ChatMessageDto,
  ChatSummaryDto,
  MessagePageDto,
} from './dto/chat-response.dto';

const MESSAGES_PAGE_SIZE = 50;
const DIRECT_CHAT_MEMBERS = 2;

const toChatMessage = ({
  messageId,
  senderId,
  content,
  sentAt,
}: MessageRow): ChatMessageDto => ({ messageId, senderId, content, sentAt });

@Injectable()
export class ChatService {
  constructor(
    private readonly chatDatabaseService: ChatDatabaseService,
    private readonly userService: UserService,
  ) {}

  async create(userId: string, peerId: string): Promise<string> {
    const normalizedPeerId = peerId.toLowerCase();

    if (normalizedPeerId === userId) {
      throw new BadRequestException('You cannot start a chat with yourself');
    }

    if (!(await this.userService.exists(normalizedPeerId))) {
      throw new NotFoundException('User not found');
    }

    return this.chatDatabaseService.findOrCreateDirectChat(
      userId,
      normalizedPeerId,
    );
  }

  findAll(userId: string): Promise<ChatSummaryDto[]> {
    return this.chatDatabaseService.getChatsOfUser(userId);
  }

  async findOne(userId: string, chatId: string): Promise<ChatDto> {
    const chat = await this.chatDatabaseService.findChatHeader(chatId, userId);
    if (!chat) throw new NotFoundException('Chat not found');

    return { ...chat, canSend: chat.peer !== null };
  }

  async findMessages(
    userId: string,
    chatId: string,
    { limit = MESSAGES_PAGE_SIZE, cursor }: PageQueryDto,
  ): Promise<MessagePageDto> {
    await this.assertMember(userId, chatId);

    const rows = await this.chatDatabaseService.findMessages({
      chatId,
      userId,
      limit,
      cursor: cursor ? decodeCursor(cursor) : undefined,
    });

    return toPage(rows, limit, toChatMessage, (row) => ({
      createdAt: row.sentCursor,
      id: row.messageId,
    }));
  }

  async clear(userId: string, chatId: string): Promise<void> {
    const isCleared = await this.chatDatabaseService.clearChat(chatId, userId);
    if (!isCleared) throw new NotFoundException('Chat not found');
  }

  async assertMember(userId: string, chatId: string): Promise<void> {
    const isMember = await this.chatDatabaseService.isMember(chatId, userId);

    if (!isMember) throw new NotFoundException('Chat not found');
  }

  async assertCanSend(userId: string, chatId: string): Promise<void> {
    const memberIds = await this.chatDatabaseService.findMemberIds(chatId);

    if (!memberIds.includes(userId)) {
      throw new NotFoundException('Chat not found');
    }
    if (memberIds.length < DIRECT_CHAT_MEMBERS) {
      throw new GoneException('User deleted');
    }
  }
}
