import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly corsOrigin: string,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: Partial<ServerOptions>): Server {
    const withCors: Partial<ServerOptions> = {
      ...options,
      cors: { origin: this.corsOrigin, credentials: true },
    };

    return super.createIOServer(port, withCors as ServerOptions);
  }
}
