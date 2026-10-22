import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

type AuthUser = { id: string };

const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<Request & { user: AuthUser }>().user,
);

export { CurrentUser };
export type { AuthUser };
