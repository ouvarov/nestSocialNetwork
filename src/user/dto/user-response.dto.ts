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

export class UserPageDto {
  @ApiProperty({ type: [UserResponseDto], description: 'Newest members first' })
  items: UserResponseDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Pass as cursor to get the next page; null on the last page',
  })
  nextCursor: string | null;
}
