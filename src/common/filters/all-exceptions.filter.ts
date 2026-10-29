import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';

import { getPostgresErrorCode } from '@/database/postgres-error';

type ErrorResponse = { status: number; body: object };

type ErrorAck = {
  ok: false;
  error: { statusCode: number; message: string };
};

const WS_ACK_ARG_INDEX = 2;

const INVALID_INPUT = {
  status: HttpStatus.BAD_REQUEST,
  message: 'Invalid input',
};

const POSTGRES_ERRORS: Record<string, { status: HttpStatus; message: string }> =
  {
    '23505': { status: HttpStatus.CONFLICT, message: 'Already exists' },
    '23503': {
      status: HttpStatus.NOT_FOUND,
      message: 'Referenced resource not found',
    },
    '22P02': INVALID_INPUT,
    '22007': INVALID_INPUT,
    '22008': INVALID_INPUT,
    '22001': INVALID_INPUT,
    '23514': INVALID_INPUT,
  };

const fromHttpException = (exception: HttpException): ErrorResponse => {
  const status = exception.getStatus();
  const response = exception.getResponse();

  return {
    status,
    body:
      typeof response === 'string'
        ? { statusCode: status, message: response }
        : response,
  };
};

const toErrorResponse = (exception: unknown): ErrorResponse => {
  if (exception instanceof HttpException) return fromHttpException(exception);

  if (exception instanceof WsException) {
    return {
      status: HttpStatus.BAD_REQUEST,
      body: { statusCode: HttpStatus.BAD_REQUEST, message: exception.message },
    };
  }

  const postgresError = POSTGRES_ERRORS[getPostgresErrorCode(exception) ?? ''];

  if (postgresError) {
    return {
      status: postgresError.status,
      body: {
        statusCode: postgresError.status,
        message: postgresError.message,
      },
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    },
  };
};

const toErrorAck = ({ status, body }: ErrorResponse): ErrorAck => {
  const message = 'message' in body ? body.message : undefined;

  return {
    ok: false,
    error: {
      statusCode: status,
      message: Array.isArray(message) ? message.join('; ') : String(message),
    },
  };
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const errorResponse = toErrorResponse(exception);

    if (errorResponse.status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (host.getType() === 'ws') {
      const acknowledge = host.getArgByIndex<
        ((errorAck: ErrorAck) => void) | undefined
      >(WS_ACK_ARG_INDEX);
      if (typeof acknowledge === 'function') {
        acknowledge(toErrorAck(errorResponse));
      }
      return;
    }

    this.httpAdapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse(),
      errorResponse.body,
      errorResponse.status,
    );
  }
}

export { toErrorAck, toErrorResponse };
export type { ErrorAck };
