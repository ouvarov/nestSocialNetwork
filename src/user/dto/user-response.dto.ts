import { Exclude, Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  userName: string;

  @Expose({ name: '_id' })
  id: number;

  @Expose()
  imageUrl: string;

  @Expose()
  following: [];

  @Expose()
  followers: [];

  @Expose()
  description: string;

  @Expose()
  created: Date;

  @Exclude()
  password: string;

  @Exclude()
  email: string;
}
