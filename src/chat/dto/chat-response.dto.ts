import { ApiProperty } from '@nestjs/swagger';

export class ChatIdDto {
  @ApiProperty({ format: 'uuid' })
  chatId: string;
}

export class ChatPeerDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Ada Lovelace' })
  userName: string;

  @ApiProperty({ type: String, nullable: true })
  imageUrl: string | null;
}

export class ChatSummaryDto {
  @ApiProperty({ format: 'uuid' })
  chatId: string;

  @ApiProperty({
    type: ChatPeerDto,
    nullable: true,
    description: 'null when the other person deleted their account',
  })
  peer: ChatPeerDto | null;

  @ApiProperty({ type: Date, nullable: true })
  lastMessageAt: Date | null;
}

export class ChatDto {
  @ApiProperty({ format: 'uuid' })
  chatId: string;

  @ApiProperty({
    type: ChatPeerDto,
    nullable: true,
    description: 'null when the other person deleted their account',
  })
  peer: ChatPeerDto | null;

  @ApiProperty({ description: 'false when the other person is gone' })
  canSend: boolean;
}

export class ChatMessageDto {
  @ApiProperty({ format: 'uuid' })
  messageId: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'null when the sender deleted their account',
  })
  senderId: string | null;

  @ApiProperty()
  content: string;

  @ApiProperty()
  sentAt: Date;
}

export class MessagePageDto {
  @ApiProperty({
    type: [ChatMessageDto],
    description: 'Newest first; only messages after you cleared the chat',
  })
  items: ChatMessageDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Pass as cursor to get older messages; null on the last page',
  })
  nextCursor: string | null;
}
