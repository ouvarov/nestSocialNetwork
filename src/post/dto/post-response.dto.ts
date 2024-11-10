import { Expose } from 'class-transformer';

export class PostResponseDto {
  @Expose({ name: 'post_id' })
  id: number;

  @Expose({ name: 'owner_id' })
  ownerId: number;

  @Expose({ name: 'image_url' })
  imageUrl: string;

  @Expose()
  text: string;

  @Expose()
  likes: [];

  @Expose({ name: 'created' })
  created: Date;
}
