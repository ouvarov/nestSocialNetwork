import type { AuthUser } from './current-user.decorator';

type AccessTokenPayload = { sub: string; typ: string; exp: number };

const toAccessTokenUser = (payload: AccessTokenPayload): AuthUser | null =>
  payload.typ === 'access' ? { id: payload.sub } : null;

export { toAccessTokenUser };
export type { AccessTokenPayload };
