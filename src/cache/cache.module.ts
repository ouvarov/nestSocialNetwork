import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [CacheModule.register({ ttl: 6 })], // Ensure CacheModule is imported
  providers: [CacheService],
  exports: [CacheService], // Make CacheService available for export
})
export class CacheDataModule {}
