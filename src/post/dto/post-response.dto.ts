import { ApiProperty } from '@nestjs/swagger';

export class PostResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  ownerId: string;

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
