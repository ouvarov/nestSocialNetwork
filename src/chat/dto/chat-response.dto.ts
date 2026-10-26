import { ApiProperty } from '@nestjs/swagger';

export class ChatIdDto {
  @ApiProperty({ format: 'uuid' })
  chatId: string;
}

export class ChatSummaryDto {
  @ApiProperty({ format: 'uuid' })
  chatId: string;

  @ApiProperty({ type: String, nullable: true })
  chatName: string | null;
}

export class ChatMessageDto {
  @ApiProperty({ format: 'uuid' })
  messageId: string;

  @ApiProperty({ format: 'uuid' })
  senderId: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  sentAt: Date;
}

export class ChatDto {
  @ApiProperty({ description: 'Empty string when the chat has no name' })
  chatName: string;

  @ApiProperty({ type: [ChatMessageDto] })
  messages: ChatMessageDto[];
}
