import type { CookieOptions, Request } from 'express';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/auth';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const clearRefreshCookieOptions = (isProduction: boolean): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: REFRESH_COOKIE_PATH,
});

const refreshCookieOptions = (isProduction: boolean): CookieOptions => ({
  ...clearRefreshCookieOptions(isProduction),
  maxAge: REFRESH_TOKEN_TTL_MS,
});

const readRefreshCookie = (request: Request): string | undefined => {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[REFRESH_COOKIE_NAME];

  return typeof value === 'string' ? value : undefined;
};

export {
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_TTL_MS,
  clearRefreshCookieOptions,
  readRefreshCookie,
  refreshCookieOptions,
};
