import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { Cursor } from '@/common/pagination/cursor';
import type {
  PostDatabaseOrmService,
  PostRow,
} from '@/database/post-database.service';
import type { UploadDatabaseService } from '@/database/upload-database.service';
import type { StorageService } from '@/storage/storage.service';
import type { UploadCleanupService } from '@/storage/upload-cleanup.service';

import { PostService } from '../post.service';

const ADA = 'ada';
const LINUS = 'linus';
const CDN = 'https://cdn.test';

type StoredPost = {
  postId: string;
  ownerId: string;
  imageUploadId: string | null;
  text: string;
  created: Date;
  editedAt: Date | null;
};

type StoredUpload = {
  ownerId: string;
  storageKey: string;
  width: number;
  height: number;
};

const createPostStore = () => {
  const posts = new Map<string, StoredPost>();
  const uploads = new Map<string, StoredUpload>();
  const likes = new Set<string>();
  let clock = Date.parse('2026-10-01T12:00:00Z');

  const likeKey = (postId: string, userId: string) => `${postId}:${userId}`;
  const toRow = (post: StoredPost, viewerId: string): PostRow => {
    const upload = post.imageUploadId
      ? uploads.get(post.imageUploadId)
      : undefined;

    return {
      postId: post.postId,
      ownerId: post.ownerId,
      authorUserName: post.ownerId.toUpperCase(),
      authorImageKey: `users/${post.ownerId}/avatar.webp`,
      authorLegacyImageUrl: null,
      imageKey: upload?.storageKey ?? null,
      legacyImageUrl: null,
      imageWidth: upload?.width ?? null,
      imageHeight: upload?.height ?? null,
      text: post.text,
      created: post.created,
      editedAt: post.editedAt,
      createdCursor: post.created.toISOString(),
      likeCount: [...likes].filter((key) => key.startsWith(`${post.postId}:`))
        .length,
      likedByMe: likes.has(likeKey(post.postId, viewerId)),
    };
  };
  const isBefore = (post: StoredPost, cursor: Cursor) =>
    post.created.toISOString() < cursor.createdAt ||
    (post.created.toISOString() === cursor.createdAt &&
      post.postId < cursor.id);

  const store = {
    createPost: ({
      userId,
      imageUploadId,
      text,
    }: {
      userId: string;
      imageUploadId?: string;
      text: string;
    }) => {
      clock += 1000;
      const postId = randomUUID();
      posts.set(postId, {
        postId,
        ownerId: userId,
        imageUploadId: imageUploadId ?? null,
        text,
        created: new Date(clock),
        editedAt: null,
      });
      return Promise.resolve(postId);
    },
    updateText: (postId: string, ownerId: string, text: string) => {
      const post = posts.get(postId);
      if (post?.ownerId !== ownerId) return Promise.resolve(false);

      posts.set(postId, { ...post, text, editedAt: new Date(clock + 500) });
      return Promise.resolve(true);
    },
    findPost: (postId: string, viewerId: string) => {
      const post = posts.get(postId);
      return Promise.resolve(post ? toRow(post, viewerId) : null);
    },
    findPostsOfOwner: ({
      ownerId,
      viewerId,
      limit,
      cursor,
    }: {
      ownerId: string;
      viewerId: string;
      limit: number;
      cursor?: Cursor;
    }) =>
      Promise.resolve(
        [...posts.values()]
          .filter((post) => post.ownerId === ownerId)
          .filter((post) => !cursor || isBefore(post, cursor))
          .sort((a, b) => b.created.getTime() - a.created.getTime())
          .slice(0, limit + 1)
          .map((post) => toRow(post, viewerId)),
      ),
    like: (postId: string, userId: string) => {
      likes.add(likeKey(postId, userId));
      return Promise.resolve();
    },
    unlike: (postId: string, userId: string) => {
      likes.delete(likeKey(postId, userId));
      return Promise.resolve();
    },
    deletePost: (postId: string, ownerId: string) => {
      const post = posts.get(postId);
      if (post?.ownerId !== ownerId) return Promise.resolve(null);

      posts.delete(postId);
      return Promise.resolve({ imageUploadId: post.imageUploadId });
    },
  };

  const uploadStore = {
    isOwnedBy: (uploadId: string, ownerId: string) =>
      Promise.resolve(uploads.get(uploadId)?.ownerId === ownerId),
  };

  const addUpload = (ownerId: string) => {
    const uploadId = randomUUID();
    uploads.set(uploadId, {
      ownerId,
      storageKey: `users/${ownerId}/${uploadId}.png`,
      width: 1200,
      height: 800,
    });
    return uploadId;
  };

  return { store, uploadStore, posts, addUpload };
};

const createPostService = () => {
  const { store, uploadStore, posts, addUpload } = createPostStore();
  const removedUploadIds: (string | null)[] = [];
  const cleanup = {
    removeIfUnused: (uploadId: string | null) => {
      removedUploadIds.push(uploadId);
      return Promise.resolve();
    },
  };
  const storage = {
    publicUrl: (path: string) => `${CDN}/${path}`,
  };
  const postService = new PostService(
    store as unknown as PostDatabaseOrmService,
    uploadStore as unknown as UploadDatabaseService,
    cleanup as unknown as UploadCleanupService,
    storage as unknown as StorageService,
  );

  return { postService, posts, addUpload, removedUploadIds };
};

describe('PostService', () => {
  it('creates a post with no likes', async () => {
    const { postService } = createPostService();

    const post = await postService.create(ADA, { text: 'hello' });

    expect(post).toMatchObject({
      ownerId: ADA,
      author: {
        id: ADA,
        userName: 'ADA',
        imageUrl: `${CDN}/users/${ADA}/avatar.webp`,
      },
      text: 'hello',
      imageUrl: null,
      imageWidth: null,
      imageHeight: null,
      editedAt: null,
      likeCount: 0,
      likedByMe: false,
    });
  });

  describe('update', () => {
    it('changes the text of your own post and marks it edited', async () => {
      const { postService } = createPostService();
      const { id } = await postService.create(ADA, { text: 'helo' });

      const post = await postService.update(ADA, id, { text: 'hello' });

      expect(post.text).toBe('hello');
      expect(post.editedAt).toBeInstanceOf(Date);
    });

    it("answers 404 for someone else's post and keeps its text", async () => {
      const { postService, posts } = createPostService();
      const { id } = await postService.create(ADA, { text: 'hello' });

      await expect(
        postService.update(LINUS, id, { text: 'hijacked' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(posts.get(id)?.text).toBe('hello');
    });
  });

  describe('image', () => {
    it('shows an image the author uploaded with its URL and size', async () => {
      const { postService, addUpload } = createPostService();
      const imageUploadId = addUpload(ADA);

      const post = await postService.create(ADA, {
        text: 'hi',
        imageUploadId,
      });

      expect(post).toMatchObject({
        imageUrl: `${CDN}/users/${ADA}/${imageUploadId}.png`,
        imageWidth: 1200,
        imageHeight: 800,
      });
    });

    it.each([
      [
        'another user upload',
        (addUpload: (id: string) => string) => addUpload(LINUS),
      ],
      ['an unknown upload', () => randomUUID()],
    ])('rejects %s', async (_case, pickUpload) => {
      const { postService, addUpload, posts } = createPostService();

      await expect(
        postService.create(ADA, {
          text: 'hi',
          imageUploadId: pickUpload(addUpload),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(posts.size).toBe(0);
    });
  });

  describe('likes', () => {
    it('counts a like once however many times it is sent', async () => {
      const { postService } = createPostService();
      const { id } = await postService.create(ADA, { text: 'hello' });

      await postService.like(LINUS, id);
      const post = await postService.like(LINUS, id);

      expect(post).toMatchObject({ likeCount: 1, likedByMe: true });
    });

    it('shows likedByMe for the caller only', async () => {
      const { postService } = createPostService();
      const { id } = await postService.create(ADA, { text: 'hello' });
      await postService.like(LINUS, id);

      const { items } = await postService.findPostsOfOwner(ADA, ADA, {
        limit: 10,
      });

      expect(items[0]).toMatchObject({ likeCount: 1, likedByMe: false });
    });

    it('removes the like on unlike', async () => {
      const { postService } = createPostService();
      const { id } = await postService.create(ADA, { text: 'hello' });
      await postService.like(LINUS, id);

      const post = await postService.unlike(LINUS, id);

      expect(post).toMatchObject({ likeCount: 0, likedByMe: false });
    });

    it('answers 404 for a post that does not exist', async () => {
      const { postService } = createPostService();

      await expect(postService.like(LINUS, randomUUID())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it("answers 404 and keeps the post when it is someone else's", async () => {
      const { postService, posts, removedUploadIds } = createPostService();
      const { id } = await postService.create(ADA, { text: 'hello' });

      await expect(postService.remove(LINUS, id)).rejects.toThrow(
        NotFoundException,
      );
      expect(posts.has(id)).toBe(true);
      expect(removedUploadIds).toEqual([]);
    });

    it('deletes the own post and hands its image to the cleanup', async () => {
      const { postService, posts, addUpload, removedUploadIds } =
        createPostService();
      const imageUploadId = addUpload(ADA);
      const { id } = await postService.create(ADA, {
        text: 'hello',
        imageUploadId,
      });

      await postService.remove(ADA, id);

      expect(posts.has(id)).toBe(false);
      expect(removedUploadIds).toEqual([imageUploadId]);
    });
  });

  describe('findPostsOfOwner', () => {
    it('pages through one owner, newest first', async () => {
      const { postService } = createPostService();
      for (const text of ['first', 'second', 'third']) {
        await postService.create(ADA, { text });
      }
      await postService.create(LINUS, { text: 'not ada' });

      const firstPage = await postService.findPostsOfOwner(ADA, LINUS, {
        limit: 2,
      });
      const secondPage = await postService.findPostsOfOwner(ADA, LINUS, {
        limit: 2,
        cursor: firstPage.nextCursor ?? undefined,
      });

      expect(firstPage.items.map(({ text }) => text)).toEqual([
        'third',
        'second',
      ]);
      expect(secondPage.items.map(({ text }) => text)).toEqual(['first']);
      expect(secondPage.nextCursor).toBeNull();
    });
  });
});
