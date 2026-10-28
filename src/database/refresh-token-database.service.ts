import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@/database/drizzle';

import {
  RefreshTokens,
  type RefreshToken,
} from '@/database/schemas/refreshTokens.schema';

type NewRefreshToken = {
  tokenId: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
};

const toRow = ({ tokenId, userId, familyId, expiresAt }: NewRefreshToken) => ({
  token_id: tokenId,
  user_id: userId,
  family_id: familyId,
  expires_at: expiresAt,
});

@Injectable()
export class RefreshTokenDatabaseService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(token: NewRefreshToken): Promise<void> {
    await this.db.insert(RefreshTokens).values(toRow(token));
  }

  async findById(tokenId: string): Promise<RefreshToken | null> {
    const [token] = await this.db
      .select()
      .from(RefreshTokens)
      .where(eq(RefreshTokens.token_id, tokenId));

    return token ?? null;
  }

  async rotate(
    currentTokenId: string,
    nextToken: NewRefreshToken,
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const revoked = await tx
        .update(RefreshTokens)
        .set({ revoked_at: new Date(), replaced_by: nextToken.tokenId })
        .where(
          and(
            eq(RefreshTokens.token_id, currentTokenId),
            isNull(RefreshTokens.revoked_at),
          ),
        )
        .returning({ tokenId: RefreshTokens.token_id });

      if (revoked.length === 0) return false;

      await tx.insert(RefreshTokens).values(toRow(nextToken));
      return true;
    });
  }

  async deleteExpiredBefore(now: Date): Promise<number> {
    const deleted = await this.db
      .delete(RefreshTokens)
      .where(lt(RefreshTokens.expires_at, now))
      .returning({ tokenId: RefreshTokens.token_id });

    return deleted.length;
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.db
      .update(RefreshTokens)
      .set({ revoked_at: new Date() })
      .where(
        and(
          eq(RefreshTokens.family_id, familyId),
          isNull(RefreshTokens.revoked_at),
        ),
      );
  }
}

export type { NewRefreshToken };
