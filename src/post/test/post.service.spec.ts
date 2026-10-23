import { NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { Cursor } from '@/common/pagination/cursor';
import type {
  PostDatabaseOrmService,
  PostRow,
} from '@/database/post-database.service';

import { PostService } from '../post.service';

const ADA = 'ada';
const LINUS = 'linus';

type StoredPost = {
  postId: string;
  ownerId: string;
  imageUrl: string | null;
  text: string;
  created: Date;
};

const createPostStore = () => {
  const posts = new Map<string, StoredPost>();
  const likes = new Set<string>();
  let clock = Date.parse('2026-10-01T12:00:00Z');

  const likeKey = (postId: string, userId: string) => `${postId}:${userId}`;
  const toRow = (post: StoredPost, viewerId: string): PostRow => ({
    ...post,
    createdCursor: post.created.toISOString(),
    likeCount: [...likes].filter((key) => key.startsWith(`${post.postId}:`))
      .length,
    likedByMe: likes.has(likeKey(post.postId, viewerId)),
  });
  const isBefore = (post: StoredPost, cursor: Cursor) =>
    post.created.toISOString() < cursor.createdAt ||
    (post.created.toISOString() === cursor.createdAt &&
      post.postId < cursor.id);

  const store = {
    createPost: ({
      userId,
      imageUrl,
      text,
    }: {
      userId: string;
      imageUrl?: string;
      text: string;
    }) => {
      clock += 1000;
      const postId = randomUUID();
      posts.set(postId, {
        postId,
        ownerId: userId,
        imageUrl: imageUrl ?? null,
        text,
        created: new Date(clock),
      });
      return Promise.resolve(postId);
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
      const isOwner = posts.get(postId)?.ownerId === ownerId;
      if (isOwner) posts.delete(postId);
      return Promise.resolve(isOwner);
    },
  };

  return { store, posts };
};

const createPostService = () => {
  const { store, posts } = createPostStore();
  const postService = new PostService(
    store as unknown as PostDatabaseOrmService,
  );

  return { postService, posts };
};

describe('PostService', () => {
  it('creates a post with no likes', async () => {
    const { postService } = createPostService();

    const post = await postService.create(ADA, { text: 'hello' });

    expect(post).toMatchObject({
      ownerId: ADA,
      text: 'hello',
      imageUrl: null,
      likeCount: 0,
      likedByMe: false,
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
      const { postService, posts } = createPostService();
      const { id } = await postService.create(ADA, { text: 'hello' });

      await expect(postService.remove(LINUS, id)).rejects.toThrow(
        NotFoundException,
      );
      expect(posts.has(id)).toBe(true);
    });

    it('deletes the own post', async () => {
      const { postService, posts } = createPostService();
      const { id } = await postService.create(ADA, { text: 'hello' });

      await postService.remove(ADA, id);

      expect(posts.has(id)).toBe(false);
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
