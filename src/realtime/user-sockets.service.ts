import { Injectable } from '@nestjs/common';
import type { Namespace, Socket } from 'socket.io';

const userRoom = (userId: string) => `user:${userId}`;

const chatRoom = (chatId: string) => `chat:${chatId.toLowerCase()}`;

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
    this.emitToUsers(userIds, 'chatsChanged');
  }

  notifyGroupChanged(userIds: string[], chatId: string): void {
    this.notifyChatsChanged(userIds);
    this.emitToUsers(userIds, 'groupChanged', {
      chatId: chatId.toLowerCase(),
    });
  }

  removeFromChat(userId: string, chatId: string): void {
    this.namespace?.in(userRoom(userId)).socketsLeave(chatRoom(chatId));
  }

  disconnectUser(userId: string): void {
    this.namespace?.in(userRoom(userId)).disconnectSockets(true);
  }

  private emitToUsers(
    userIds: string[],
    event: string,
    ...payload: unknown[]
  ): void {
    // socket.io reads an empty room list as "everyone"
    if (userIds.length === 0) return;

    this.namespace?.to(userIds.map(userRoom)).emit(event, ...payload);
  }
}

export { chatRoom };
