import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { extname } from 'path';

@Injectable()
export class UploadService {
  private supabaseClient;

  constructor(private readonly configService: ConfigService) {
    this.supabaseClient = createClient(
      configService.get<string>('SUPABASE_URL'),
      configService.get<string>('SUPABASE_ANON_KEY'),
    );
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    const filePath = `uploads/${Date.now()}${extname(file.originalname)}`;
    const { error } = await this.supabaseClient.storage
      .from('images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data: publicUrlData } = this.supabaseClient.storage
      .from('images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  }
}
