import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { Socket } from 'socket.io';

import type { ProxiedRequest } from '@/common/proxy/require-proxy';

import { AppThrottlerGuard } from './throttler.guard';

class ExposedGuard extends AppThrottlerGuard {
  requestOf(context: ExecutionContext) {
    return this.getRequestResponse(context);
  }

  trackerOf(req: Partial<ProxiedRequest>) {
    return this.getTracker(req);
  }
}

const guard = new ExposedGuard(
  { throttlers: [] },
  {} as ThrottlerStorage,
  new Reflector(),
);

const wsContext = (data: object): ExecutionContext => {
  const client = {
    data,
    handshake: { address: '10.0.0.1', headers: { host: 'pulse.test' } },
  } as unknown as Socket;

  return {
    getType: () => 'ws',
    switchToWs: () => ({ getClient: () => client }),
  } as unknown as ExecutionContext;
};

describe('AppThrottlerGuard over WebSocket', () => {
  it('tracks a signed-in socket by user, wherever it connects from', async () => {
    const { req } = guard.requestOf(
      wsContext({
        session: { user: { id: 'ada' }, expiresAtEpochMs: Date.now() + 1000 },
      }),
    );

    await expect(guard.trackerOf(req as Partial<ProxiedRequest>)).resolves.toBe(
      'user:ada',
    );
  });

  it('falls back to the address for a socket without a session', async () => {
    const { req } = guard.requestOf(wsContext({}));

    await expect(guard.trackerOf(req as Partial<ProxiedRequest>)).resolves.toBe(
      '10.0.0.1',
    );
  });

  it('gives the throttler a response it can set headers on', () => {
    const { res } = guard.requestOf(wsContext({}));

    expect(() => res.header('x-ratelimit-limit', '1')).not.toThrow();
  });
});
