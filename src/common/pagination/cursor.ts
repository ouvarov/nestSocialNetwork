import { BadRequestException } from '@nestjs/common';

type Cursor = { createdAt: string; id: string };

const encodeCursor = (cursor: object): string =>
  Buffer.from(JSON.stringify(cursor)).toString('base64url');

const isCursor = (value: unknown): value is Cursor =>
  typeof value === 'object' &&
  value !== null &&
  'createdAt' in value &&
  'id' in value &&
  typeof value.createdAt === 'string' &&
  typeof value.id === 'string';

const decodePageCursor = <PageCursor>(
  encoded: string,
  isValid: (value: unknown) => value is PageCursor,
): PageCursor => {
  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8'),
    );
    if (isValid(decoded)) return decoded;
  } catch {
    throw new BadRequestException('Invalid cursor');
  }

  throw new BadRequestException('Invalid cursor');
};

const decodeCursor = (encoded: string): Cursor =>
  decodePageCursor(encoded, isCursor);

const toPage = <Row, Item, PageCursor extends object = Cursor>(
  rows: Row[],
  limit: number,
  toItem: (row: Row) => Item,
  toCursor: (row: Row) => PageCursor,
) => {
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = pageRows.at(-1);

  return {
    items: pageRows.map(toItem),
    nextCursor: hasMore && lastRow ? encodeCursor(toCursor(lastRow)) : null,
  };
};

export { decodeCursor, decodePageCursor, encodeCursor, isCursor, toPage };
export type { Cursor };
