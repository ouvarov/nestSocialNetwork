import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { RefreshTokenDatabaseService } from '@/database/refresh-token-database.service';

@Injectable()
export class RefreshTokenCleanupService {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);

  constructor(
    private readonly refreshTokenDatabaseService: RefreshTokenDatabaseService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async removeExpiredTokens(): Promise<void> {
    const removedCount =
      await this.refreshTokenDatabaseService.deleteExpiredBefore(new Date());

    this.logger.log(`Removed ${removedCount} expired refresh tokens`);
  }
}
