import { ApiProperty } from '@nestjs/swagger';

export class PostAuthorDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Ada Lovelace' })
  userName: string;

  @ApiProperty({ type: String, nullable: true })
  imageUrl: string | null;
}

export class PostResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  ownerId: string;

  @ApiProperty({ type: PostAuthorDto })
  author: PostAuthorDto;

  @ApiProperty({ type: String, nullable: true })
  imageUrl: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'Null for posts without an image or from before sizes were stored',
  })
  imageWidth: number | null;

  @ApiProperty({ type: Number, nullable: true })
  imageHeight: number | null;

  @ApiProperty()
  text: string;

  @ApiProperty()
  created: Date;

  @ApiProperty({
    type: Date,
    nullable: true,
    description: 'When the text was last edited',
  })
  editedAt: Date | null;

  @ApiProperty({ example: 3 })
  likeCount: number;

  @ApiProperty({ description: 'Whether the caller liked this post' })
  likedByMe: boolean;
}

export class PostPageDto {
  @ApiProperty({ type: [PostResponseDto] })
  items: PostResponseDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Pass as cursor to get the next page; null on the last page',
  })
  nextCursor: string | null;
}

export class FeedItemDto extends PostResponseDto {
  @ApiProperty({
    description:
      'True for posts by people the caller followed when the feed was opened, and for their own posts',
  })
  fromFollowing: boolean;
}

export class FeedPageDto {
  @ApiProperty({
    type: [FeedItemDto],
    description:
      'Followed people and own posts first, newest first; then everyone else',
  })
  items: FeedItemDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Pass as cursor to get the next page; it keeps the moment the feed was opened, so new posts do not shift pages. An unfollow during the session can return posts already shown: dedupe by id',
  })
  nextCursor: string | null;
}
