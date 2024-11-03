import { Expose } from 'class-transformer';

export class PostResponseDto {
  @Expose({ name: '_id' })
  id: number;

  @Expose()
  ownerId: number;

  @Expose()
  imageUrl: string;

  @Expose()
  text: string;

  @Expose()
  likes: [];

  @Expose()
  createdAt: Date;
}
