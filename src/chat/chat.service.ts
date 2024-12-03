import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ChatDatabaseService } from '../database/chat-database.service';
import { UpdateChatDto } from './dto/update-chat.dto';
import { GetChatDto } from './dto/get-chat.dto';

@Injectable()
export class ChatService {
  constructor(private readonly chatDatabaseModule: ChatDatabaseService) {}
  async create(userIds: string[]) {
    try {
      return await this.chatDatabaseModule.createChat({
        userIds,
      });
    } catch (error) {
      if (error.code === '23503') {
        throw new HttpException(
          'Referenced data not found. Please check your input.',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'An unexpected error occurred.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll() {
    return await this.chatDatabaseModule.getAllChats();
  }

  async findOne(id: GetChatDto) {
    try {
      return await this.chatDatabaseModule.getChatWithMessages(id);
    } catch (error) {
      if (error.code === '22P02') {
        throw new HttpException(
          'Invalid input format. Please check your data.',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'An unexpected error occurred.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteChat(id: string) {
    return await this.chatDatabaseModule.deleteChat(id);
  }

  async updateChatName(updateChatDto: UpdateChatDto) {
    return await this.chatDatabaseModule.updateChatName(updateChatDto);
  }
}
