import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Ada Lovelace' })
  userName: string;

  @ApiProperty({ type: String, nullable: true })
  imageUrl: string | null;

  @ApiProperty()
  description: string;

  @ApiProperty()
  created: Date;
}

export class ProfileResponseDto extends UserResponseDto {
  @ApiProperty({ example: 24 })
  followersCount: number;

  @ApiProperty({ example: 2 })
  followingCount: number;

  @ApiProperty({ description: 'Whether the caller follows this user' })
  isFollowedByMe: boolean;
}

export class PersonResponseDto extends UserResponseDto {
  @ApiProperty({ example: 41 })
  followersCount: number;

  @ApiProperty({ description: 'Whether the caller follows this user' })
  isFollowedByMe: boolean;
}

export class UserPageDto {
  @ApiProperty({
    type: [PersonResponseDto],
    description: 'Newest members first',
  })
  items: PersonResponseDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Pass as cursor to get the next page; null on the last page',
  })
  nextCursor: string | null;
}

export class FollowStateDto {
  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty()
  isFollowedByMe: boolean;

  @ApiProperty({ example: 24 })
  followersCount: number;

  @ApiProperty({ example: 2 })
  followingCount: number;
}
