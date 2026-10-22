import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';

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
  constructor(
    @Inject('DRIZZLE_ORM')
    private readonly Drizzle: ReturnType<typeof drizzle>,
  ) {}

  async create(token: NewRefreshToken): Promise<void> {
    await this.Drizzle.insert(RefreshTokens).values(toRow(token));
  }

  async findById(tokenId: string): Promise<RefreshToken | null> {
    const [token] = await this.Drizzle.select()
      .from(RefreshTokens)
      .where(eq(RefreshTokens.token_id, tokenId));

    return token ?? null;
  }

  async rotate(
    currentTokenId: string,
    nextToken: NewRefreshToken,
  ): Promise<boolean> {
    return this.Drizzle.transaction(async (tx) => {
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

  async revoke(tokenId: string): Promise<void> {
    await this.Drizzle.update(RefreshTokens)
      .set({ revoked_at: new Date() })
      .where(
        and(
          eq(RefreshTokens.token_id, tokenId),
          isNull(RefreshTokens.revoked_at),
        ),
      );
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.Drizzle.update(RefreshTokens)
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
