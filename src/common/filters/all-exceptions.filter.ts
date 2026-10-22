import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import { getPostgresErrorCode } from '@/database/postgres-error';

type ErrorResponse = { status: number; body: object };

const POSTGRES_ERRORS: Record<string, { status: HttpStatus; message: string }> =
  {
    '23505': { status: HttpStatus.CONFLICT, message: 'Already exists' },
    '23503': {
      status: HttpStatus.NOT_FOUND,
      message: 'Referenced resource not found',
    },
    '22P02': { status: HttpStatus.BAD_REQUEST, message: 'Invalid input' },
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

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { status, body } = toErrorResponse(exception);

    if (status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    this.httpAdapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse(),
      body,
      status,
    );
  }
}

export { toErrorResponse };
