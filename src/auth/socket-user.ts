import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';

import type { AuthUser } from './current-user.decorator';

type SocketData = { user?: AuthUser };

const findSocketUser = (client: Socket): AuthUser | undefined =>
  (client.data as SocketData).user;

const getSocketUser = (client: Socket): AuthUser => {
  const user = findSocketUser(client);
  if (!user) throw new WsException('Unauthorized');
  return user;
};

const setSocketUser = (client: Socket, user: AuthUser) => {
  (client.data as SocketData).user = user;
};

export { findSocketUser, getSocketUser, setSocketUser };
