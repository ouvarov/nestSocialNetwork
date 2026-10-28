import { Injectable } from '@nestjs/common';
import type { Namespace, Socket } from 'socket.io';

const userRoom = (userId: string) => `user:${userId}`;

@Injectable()
export class UserSocketsService {
  private namespace: Namespace | null = null;

  attach(namespace: Namespace): void {
    this.namespace = namespace;
  }

  async register(client: Socket, userId: string): Promise<void> {
    await client.join(userRoom(userId));
  }

  disconnectUser(userId: string): void {
    this.namespace?.in(userRoom(userId)).disconnectSockets(true);
  }
}
