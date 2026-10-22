import { type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Socket } from 'socket.io';

import { IS_PUBLIC_KEY } from './public.decorator';
import { findSocketUser } from './socket-user';

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
      return Boolean(findSocketUser(context.switchToWs().getClient<Socket>()));
    }

    return super.canActivate(context);
  }
}
