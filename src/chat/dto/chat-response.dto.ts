import { ApiProperty } from '@nestjs/swagger';

import type { ChatRole } from '@/database/schemas/chatMembers.schema';
import type { ChatKind } from '@/database/schemas/chats.schema';

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

const CHAT_KIND_VALUES = ['direct', 'group'];
const CHAT_ROLE_VALUES = ['owner', 'moderator', 'member'];

export class ChatMemberDto extends ChatPeerDto {
  @ApiProperty({ enum: CHAT_ROLE_VALUES })
  role: ChatRole;
}

export class LastMessageDto {
  @ApiProperty({
    example: 'Green on the first try. Suspicious.',
    description: 'The first 200 characters of the message',
  })
  content: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'null when the sender deleted their account',
  })
  senderId: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'null when the sender deleted their account',
  })
  senderName: string | null;

  @ApiProperty()
  sentAt: Date;
}

export class ChatSummaryDto {
  @ApiProperty({ format: 'uuid' })
  chatId: string;

  @ApiProperty({ enum: CHAT_KIND_VALUES })
  kind: ChatKind;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The group name; null for a direct chat',
  })
  title: string | null;

  @ApiProperty({ type: 'integer', example: 2 })
  memberCount: number;

  @ApiProperty({
    type: ChatPeerDto,
    nullable: true,
    description:
      'null in a group, or when the other person deleted their account',
  })
  peer: ChatPeerDto | null;

  @ApiProperty({ type: Date, nullable: true })
  lastMessageAt: Date | null;

  @ApiProperty({
    type: LastMessageDto,
    nullable: true,
    description: 'The latest message you can see in the chat',
  })
  lastMessage: LastMessageDto | null;

  @ApiProperty({
    type: 'integer',
    example: 2,
    description: 'Messages from others since you last read the chat',
  })
  unreadCount: number;
}

export class ChatDto {
  @ApiProperty({ format: 'uuid' })
  chatId: string;

  @ApiProperty({ enum: CHAT_KIND_VALUES })
  kind: ChatKind;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The group name; null for a direct chat',
  })
  title: string | null;

  @ApiProperty({ enum: CHAT_ROLE_VALUES })
  myRole: ChatRole;

  @ApiProperty({
    type: ChatPeerDto,
    nullable: true,
    description:
      'null in a group, or when the other person deleted their account',
  })
  peer: ChatPeerDto | null;

  @ApiProperty({
    type: [ChatMemberDto],
    description: 'Everyone in a group, oldest first; empty for a direct chat',
  })
  members: ChatMemberDto[];

  @ApiProperty({
    description:
      'false when the other person in a direct chat is gone; always true in a group',
  })
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

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'null when the sender deleted their account',
  })
  senderName: string | null;

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
