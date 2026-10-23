import { BadRequestException } from '@nestjs/common';

type Cursor = { createdAt: string; id: string };

const encodeCursor = (cursor: Cursor): string =>
  Buffer.from(JSON.stringify(cursor)).toString('base64url');

const isCursor = (value: unknown): value is Cursor =>
  typeof value === 'object' &&
  value !== null &&
  'createdAt' in value &&
  'id' in value &&
  typeof value.createdAt === 'string' &&
  typeof value.id === 'string';

const decodeCursor = (encoded: string): Cursor => {
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    );
    if (isCursor(decoded)) return decoded;
  } catch {
    throw new BadRequestException('Invalid cursor');
  }

  throw new BadRequestException('Invalid cursor');
};

const toPage = <Row, Item>(
  rows: Row[],
  limit: number,
  toItem: (row: Row) => Item,
  toCursor: (row: Row) => Cursor,
) => {
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = pageRows.at(-1);

  return {
    items: pageRows.map(toItem),
    nextCursor: hasMore && lastRow ? encodeCursor(toCursor(lastRow)) : null,
  };
};

export { decodeCursor, encodeCursor, toPage };
export type { Cursor };
