import { BadRequestException, NotFoundException } from '@nestjs/common';

import type { FollowDatabaseService } from '@/database/follow-database.service';

import { FollowService } from '../follow.service';
import type { UserService } from '../user.service';

const ADA = 'ada';
const LINUS = 'linus';

const createFollowService = (existingUserIds = [ADA, LINUS]) => {
  const follows = new Set<string>();
  const invalidated: string[][] = [];
  let writes = 0;

  const count = (matches: (follower: string, followee: string) => boolean) =>
    [...follows].filter((key) =>
      matches(...(key.split(':') as [string, string])),
    ).length;

  const database = {
    follow: (follower: string, followee: string) => {
      writes += 1;
      follows.add(`${follower}:${followee}`);
      return Promise.resolve();
    },
    unfollow: (follower: string, followee: string) => {
      writes += 1;
      follows.delete(`${follower}:${followee}`);
      return Promise.resolve();
    },
    findState: (viewer: string, user: string) =>
      Promise.resolve({
        isFollowedByMe: follows.has(`${viewer}:${user}`),
        followersCount: count((_, followee) => followee === user),
        followingCount: count((follower) => follower === user),
      }),
  } as unknown as FollowDatabaseService;
  const users = {
    exists: (id: string) => Promise.resolve(existingUserIds.includes(id)),
    invalidateProfiles: (ids: string[]) => {
      invalidated.push(ids);
      return Promise.resolve();
    },
  } as unknown as UserService;

  return {
    followService: new FollowService(database, users),
    invalidated,
    writes: () => writes,
  };
};

describe('FollowService', () => {
  it('follows once however many times it is sent', async () => {
    const { followService } = createFollowService();

    await followService.follow(ADA, LINUS);
    const state = await followService.follow(ADA, LINUS);

    expect(state).toEqual({
      userId: LINUS,
      isFollowedByMe: true,
      followersCount: 1,
      followingCount: 0,
    });
  });

  it('forgets the cached profiles of both people', async () => {
    const { followService, invalidated } = createFollowService();

    await followService.follow(ADA, LINUS);
    await followService.unfollow(ADA, LINUS);

    expect(invalidated).toEqual([
      [ADA, LINUS],
      [ADA, LINUS],
    ]);
  });

  it('unfollows', async () => {
    const { followService } = createFollowService();
    await followService.follow(ADA, LINUS);

    const state = await followService.unfollow(ADA, LINUS);

    expect(state).toMatchObject({ isFollowedByMe: false, followersCount: 0 });
  });

  it.each(['follow', 'unfollow'] as const)(
    'refuses to %s yourself without writing',
    async (action) => {
      const { followService, writes } = createFollowService();

      await expect(followService[action](ADA, ADA)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(writes()).toBe(0);
    },
  );

  it('answers 404 when unfollowing someone who does not exist', async () => {
    const { followService, writes } = createFollowService([ADA]);

    await expect(followService.unfollow(ADA, LINUS)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(writes()).toBe(0);
  });
});
