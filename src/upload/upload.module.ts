import { Module } from '@nestjs/common';

import { StorageModule } from '@/storage/storage.module';
import { UserModule } from '@/user/user.module';

import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [StorageModule, UserModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
