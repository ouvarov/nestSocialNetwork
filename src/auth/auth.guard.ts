import {
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Socket } from 'socket.io';

import { IS_PUBLIC_KEY } from './public.decorator';
import { findSocketSession, isSessionAlive } from './socket-user';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    if (context.getType() === 'ws') {
      return this.canActivateSocket(context.switchToWs().getClient<Socket>());
    }

    return super.canActivate(context);
  }

  private canActivateSocket(client: Socket): boolean {
    if (isSessionAlive(findSocketSession(client))) return true;

    client.disconnect(true);
    throw new UnauthorizedException('Access token expired');
  }
}
