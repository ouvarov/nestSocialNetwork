import { type ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Socket } from 'socket.io';

import { findSocketSession } from '@/auth/socket-user';
import type { ProxiedRequest } from '@/common/proxy/require-proxy';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    if (context.getType() !== 'ws') return super.getRequestResponse(context);

    const client = context.switchToWs().getClient<Socket>();
    const user = findSocketSession(client)?.user;

    return {
      req: {
        ip: client.handshake.address,
        clientIp: user ? `user:${user.id}` : undefined,
        headers: client.handshake.headers,
      },
      res: { header: () => undefined },
    };
  }

  protected getTracker(req: Partial<ProxiedRequest>): Promise<string> {
    return Promise.resolve(req.clientIp ?? req.ip ?? '');
  }
}
