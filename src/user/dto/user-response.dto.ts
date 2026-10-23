import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({ example: 'Ada Lovelace' })
  @Expose({ name: 'user_name' })
  userName: string;

  @ApiProperty({ format: 'uuid' })
  @Expose({ name: 'user_id' })
  id: string;

  @ApiProperty({ type: String, nullable: true })
  @Expose({ name: 'image_url' })
  imageUrl: string | null;

  @ApiProperty()
  @Expose({ name: 'description' })
  description: string;

  @ApiProperty()
  @Expose({ name: 'created' })
  created: Date;

  @Exclude()
  password: string;

  @Exclude()
  email: string;
}
