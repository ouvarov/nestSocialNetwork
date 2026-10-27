import { HttpStatus } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';

type ProxiedRequest = Request & { clientIp?: string };

const ORIGIN_SECRET_HEADER = 'x-origin-secret';
const CLIENT_IP_HEADER = 'x-real-ip';
const DIRECT_PATHS = ['/api/health/', '/docs', '/socket.io/'];

const isFromProxy = (request: Request, expected: Buffer): boolean => {
  const received = Buffer.from(
    String(request.headers[ORIGIN_SECRET_HEADER] ?? ''),
  );

  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
};

const requireProxy = (originSecret: string) => {
  const expected = Buffer.from(originSecret);

  return (request: ProxiedRequest, response: Response, next: NextFunction) => {
    if (DIRECT_PATHS.some((path) => request.path.startsWith(path))) {
      return next();
    }

    if (!isFromProxy(request, expected)) {
      response.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Requests must come through the web app',
      });
      return;
    }

    const clientIp = request.headers[CLIENT_IP_HEADER];
    if (typeof clientIp === 'string') request.clientIp = clientIp;

    next();
  };
};

export { requireProxy };
export type { ProxiedRequest };
