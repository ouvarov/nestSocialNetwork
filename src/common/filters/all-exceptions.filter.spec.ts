import { NotFoundException } from '@nestjs/common';

import { toErrorResponse } from './all-exceptions.filter';

const postgresError = (code: string) =>
  Object.assign(new Error('db error'), { code });

describe('toErrorResponse', () => {
  it('keeps the status and body of an HttpException', () => {
    expect(toErrorResponse(new NotFoundException('Post not found'))).toEqual({
      status: 404,
      body: {
        statusCode: 404,
        message: 'Post not found',
        error: 'Not Found',
      },
    });
  });

  it.each([
    ['23505', 409],
    ['23503', 404],
    ['22P02', 400],
    ['22007', 400],
    ['22008', 400],
  ])('maps postgres error %s to %i', (code, status) => {
    expect(toErrorResponse(postgresError(code)).status).toBe(status);
  });

  it('finds the postgres code on a wrapped error', () => {
    const wrapped = Object.assign(new Error('query failed'), {
      cause: postgresError('23505'),
    });

    expect(toErrorResponse(wrapped).status).toBe(409);
  });

  it('hides unknown errors behind a generic 500', () => {
    expect(toErrorResponse(new Error('secret details'))).toEqual({
      status: 500,
      body: { statusCode: 500, message: 'Internal server error' },
    });
  });
});
