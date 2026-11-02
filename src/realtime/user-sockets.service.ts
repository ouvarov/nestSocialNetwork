import { Injectable } from '@nestjs/common';
import type { Namespace, Socket } from 'socket.io';

const userRoom = (userId: string) => `user:${userId}`;

const chatRoom = (chatId: string) => `chat:${chatId}`;

@Injectable()
export class UserSocketsService {
  private namespace: Namespace | null = null;

  attach(namespace: Namespace): void {
    this.namespace = namespace;
  }

  async register(client: Socket, userId: string): Promise<void> {
    await client.join(userRoom(userId));
  }

  notifyChatsChanged(userIds: string[]): void {
    this.namespace?.to(userIds.map(userRoom)).emit('chatsChanged');
  }

  notifyGroupChanged(userIds: string[], chatId: string): void {
    this.notifyChatsChanged(userIds);
    this.namespace?.to(userIds.map(userRoom)).emit('groupChanged', { chatId });
  }

  removeFromChat(userId: string, chatId: string): void {
    this.namespace?.in(userRoom(userId)).socketsLeave(chatRoom(chatId));
  }

  closeChat(chatId: string): void {
    this.namespace?.in(chatRoom(chatId)).socketsLeave(chatRoom(chatId));
  }

  disconnectUser(userId: string): void {
    this.namespace?.in(userRoom(userId)).disconnectSockets(true);
  }
}

export { chatRoom };
