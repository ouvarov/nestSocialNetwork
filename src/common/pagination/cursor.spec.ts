import { BadRequestException } from '@nestjs/common';

import { decodeCursor, encodeCursor, toPage } from './cursor';

const rows = [1, 2, 3].map((index) => ({
  id: `id-${index}`,
  createdAt: `2026-10-0${index} 12:00:00.123456+00`,
}));

describe('cursor pagination', () => {
  it('round-trips a cursor without losing timestamp precision', () => {
    const cursor = { createdAt: '2026-10-01 12:00:00.123456+00', id: 'id-1' };

    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it.each(['not-base64-json', encodeCursor({ id: 'x' } as never)])(
    'rejects a malformed cursor %s with 400',
    (encoded) => {
      expect(() => decodeCursor(encoded)).toThrow(BadRequestException);
    },
  );

  it('returns the next cursor only when there is another page', () => {
    const page = toPage(
      rows,
      2,
      (row) => row.id,
      (row) => row,
    );

    expect(page.items).toEqual(['id-1', 'id-2']);
    expect(decodeCursor(page.nextCursor ?? '')).toEqual(rows[1]);
  });

  it('has no next cursor on the last page', () => {
    expect(
      toPage(
        rows,
        3,
        (row) => row.id,
        (row) => row,
      ).nextCursor,
    ).toBeNull();
  });
});
