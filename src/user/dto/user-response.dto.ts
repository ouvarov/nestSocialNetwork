import { Exclude, Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose({ name: 'user_name' })
  userName: string;

  @Expose({ name: 'user_id' })
  id: string;

  @Expose({ name: 'image_url' })
  imageUrl: string;

  @Expose({ name: 'description' })
  description: string;

  @Expose({ name: 'created' })
  created: Date;

  @Exclude()
  password: string;

  @Exclude()
  email: string;
}
