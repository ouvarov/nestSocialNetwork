import { Injectable } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import type { Env } from '@/config/env.schema';
import { extname } from 'path';

@Injectable()
export class UploadService {
  private readonly supabaseClient: SupabaseClient;

  constructor(private readonly configService: ConfigService<Env, true>) {
    this.supabaseClient = createClient(
      configService.get('SUPABASE_URL', { infer: true }),
      configService.get('SUPABASE_ANON_KEY', { infer: true }),
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
