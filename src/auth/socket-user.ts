import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';

import type { AuthUser } from './current-user.decorator';

type SocketSession = { user: AuthUser; expiresAtEpochMs: number };

type SocketData = { session?: SocketSession };

const findSocketSession = (client: Socket): SocketSession | undefined =>
  (client.data as SocketData).session;

const isSessionAlive = (session: SocketSession | undefined): boolean =>
  session !== undefined && session.expiresAtEpochMs > Date.now();

const getSocketUser = (client: Socket): AuthUser => {
  const session = findSocketSession(client);
  if (!session) throw new WsException('Unauthorized');
  return session.user;
};

const setSocketSession = (client: Socket, session: SocketSession) => {
  (client.data as SocketData).session = session;
};

export { findSocketSession, getSocketUser, isSessionAlive, setSocketSession };
export type { SocketSession };
