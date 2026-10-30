import type { PostRow } from '@/database/post-database.service';
import { toImageUrl } from '@/storage/image-url';
import type { StorageService } from '@/storage/storage.service';

import type { PostResponseDto } from './dto/post-response.dto';

const toPostResponse = (
  storage: StorageService,
  post: PostRow,
): PostResponseDto => ({
  id: post.postId,
  ownerId: post.ownerId,
  author: {
    id: post.ownerId,
    userName: post.authorUserName,
    imageUrl: toImageUrl(storage, {
      imageKey: post.authorImageKey,
      legacyImageUrl: post.authorLegacyImageUrl,
    }),
  },
  imageUrl: toImageUrl(storage, post),
  imageWidth: post.imageWidth,
  imageHeight: post.imageHeight,
  text: post.text,
  created: post.created,
  editedAt: post.editedAt,
  likeCount: post.likeCount,
  likedByMe: post.likedByMe,
});

export { toPostResponse };
