import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { MemoryCacheService } from '@/cache/memory-cache.service';
import type { FollowDatabaseService } from '@/database/follow-database.service';
import type { UploadDatabaseService } from '@/database/upload-database.service';
import type {
  ProfilePatch,
  PublicUser,
  UserDatabaseOrmService,
} from '@/database/user-database.service';
import type { UserSocketsService } from '@/realtime/user-sockets.service';
import type { StorageService } from '@/storage/storage.service';
import type { UploadCleanupService } from '@/storage/upload-cleanup.service';

import { UserService } from '../user.service';

const ADA_ID = '7f6b2c1e-0000-4000-8000-000000000001';
const LINUS_ID = '7f6b2c1e-0000-4000-8000-000000000002';
const ADA_AVATAR = 'upload-ada-1';
const ADA_NEW_AVATAR = 'upload-ada-2';
const LINUS_AVATAR = 'upload-linus-1';

const userWith = (id: string, userName: string): PublicUser => ({
  id,
  userName,
  description: '',
  created: new Date('2026-01-01T00:00:00Z'),
  imageKey: null,
  legacyImageUrl: null,
});

const ADA = userWith(ADA_ID, 'Ada Lovelace');
const LINUS = userWith(LINUS_ID, 'Linus Torvalds');

const PASSWORD = 'correct-horse-battery';
const TEST_HASH_ROUNDS = 4;

const UPLOADS = new Map([
  [ADA_AVATAR, ADA_ID],
  [ADA_NEW_AVATAR, ADA_ID],
  [LINUS_AVATAR, LINUS_ID],
]);

const createUserService = (
  users: PublicUser[],
  storage: Partial<StorageService> = {},
) => {
  let databaseReads = 0;
  const profiles = new Map(
    users.map((user) => [
      user.id,
      { ...user, avatarUploadId: null as string | null },
    ]),
  );
  const follows = new Set<string>();
  const patches: ProfilePatch[] = [];
  const deletedUserIds: string[] = [];
  const disconnectedUserIds: string[] = [];
  const cleanedUploadIds: (string | null)[] = [];
  const passwordHash = bcrypt.hashSync(PASSWORD, TEST_HASH_ROUNDS);

  const countFollows = (
    matches: (follower: string, followee: string) => boolean,
  ) =>
    [...follows].filter((key) =>
      matches(...(key.split(':') as [string, string])),
    ).length;

  const database = {
    findPublicProfile: (id: string) => {
      databaseReads += 1;
      const profile = profiles.get(id);
      if (!profile) return Promise.resolve(null);

      const { avatarUploadId, ...user } = profile;
      return Promise.resolve({
        ...user,
        imageKey: avatarUploadId ? `users/${id}/${avatarUploadId}.webp` : null,
        followersCount: countFollows((_, followee) => followee === id),
        followingCount: countFollows((follower) => follower === id),
      });
    },
    findById: (id: string) =>
      Promise.resolve(
        profiles.has(id) ? { user_id: id, password: passwordHash } : null,
      ),
    updateProfile: (id: string, patch: ProfilePatch) => {
      const profile = profiles.get(id);
      if (!profile) return Promise.resolve(null);

      patches.push(patch);
      const previousAvatarUploadId = profile.avatarUploadId;
      profiles.set(id, {
        ...profile,
        userName: patch.userName ?? profile.userName,
        description: patch.description ?? profile.description,
        avatarUploadId:
          patch.avatarUploadId === undefined
            ? profile.avatarUploadId
            : patch.avatarUploadId,
      });
      return Promise.resolve({ previousAvatarUploadId });
    },
    deleteUser: (id: string) => {
      deletedUserIds.push(id);
      profiles.delete(id);
      return Promise.resolve(true);
    },
  } as unknown as UserDatabaseOrmService;
  const followDatabase = {
    isFollowing: (follower: string, followee: string) =>
      Promise.resolve(follows.has(`${follower}:${followee}`)),
  } as unknown as FollowDatabaseService;
  const uploadDatabase = {
    isOwnedBy: (uploadId: string, ownerId: string) =>
      Promise.resolve(UPLOADS.get(uploadId) === ownerId),
  } as unknown as UploadDatabaseService;
  const userSockets = {
    disconnectUser: (id: string) => disconnectedUserIds.push(id),
  } as unknown as UserSocketsService;
  const storageService = {
    publicUrl: (path: string) => `https://cdn.test/${path}`,
    removeDirectory: () => Promise.resolve(),
    ...storage,
  } as unknown as StorageService;
  const uploadCleanup = {
    removeIfUnused: (uploadId: string | null) => {
      cleanedUploadIds.push(uploadId);
      return Promise.resolve();
    },
  } as unknown as UploadCleanupService;

  return {
    userService: new UserService(
      database,
      followDatabase,
      uploadDatabase,
      new MemoryCacheService(),
      userSockets,
      storageService,
      uploadCleanup,
    ),
    databaseReads: () => databaseReads,
    follow: (follower: string, followee: string) =>
      follows.add(`${follower}:${followee}`),
    patches,
    deletedUserIds,
    disconnectedUserIds,
    cleanedUploadIds,
  };
};

describe('UserService.findProfile', () => {
  it('reads the profile from the database once and then from the cache', async () => {
    const { userService, databaseReads } = createUserService([ADA]);

    const first = await userService.findProfile(ADA_ID, ADA_ID);
    const second = await userService.findProfile(ADA_ID, ADA_ID);

    expect(first.userName).toBe('Ada Lovelace');
    expect(second).toEqual(first);
    expect(databaseReads()).toBe(1);
  });

  it('drops the cached profile whatever the case of the id', async () => {
    const { userService, databaseReads } = createUserService([ADA]);
    await userService.findProfile(ADA_ID, ADA_ID);

    await userService.invalidateProfiles([ADA_ID.toUpperCase()]);
    await userService.findProfile(ADA_ID, ADA_ID);

    expect(databaseReads()).toBe(2);
  });

  it('does not cache a missing user', async () => {
    const { userService, databaseReads } = createUserService([]);

    await expect(userService.findProfile(ADA_ID, ADA_ID)).rejects.toThrow(
      NotFoundException,
    );
    await expect(userService.findProfile(ADA_ID, ADA_ID)).rejects.toThrow(
      NotFoundException,
    );
    expect(databaseReads()).toBe(2);
  });

  it('answers isFollowedByMe per viewer from one cached profile', async () => {
    const { userService, databaseReads, follow } = createUserService([
      ADA,
      LINUS,
    ]);
    follow(LINUS_ID, ADA_ID);

    const seenByLinus = await userService.findProfile(ADA_ID, LINUS_ID);
    const seenByAda = await userService.findProfile(ADA_ID, ADA_ID);

    expect(seenByLinus).toMatchObject({
      isFollowedByMe: true,
      followersCount: 1,
    });
    expect(seenByAda).toMatchObject({
      isFollowedByMe: false,
      followersCount: 1,
    });
    expect(databaseReads()).toBe(1);
  });
});

describe('UserService.updateProfile', () => {
  it('shows the new name right after a cached read', async () => {
    const { userService } = createUserService([ADA]);
    await userService.findProfile(ADA_ID, ADA_ID);

    await userService.updateProfile(ADA_ID, { userName: 'Ada L.' });

    expect(await userService.findProfile(ADA_ID, ADA_ID)).toMatchObject({
      userName: 'Ada L.',
    });
  });

  it('builds the avatar URL from the upload', async () => {
    const { userService } = createUserService([ADA]);

    const user = await userService.updateProfile(ADA_ID, {
      avatarUploadId: ADA_AVATAR,
    });

    expect(user.imageUrl).toBe(
      `https://cdn.test/users/${ADA_ID}/${ADA_AVATAR}.webp`,
    );
  });

  it("rejects another user's upload as an avatar without writing", async () => {
    const { userService, patches } = createUserService([ADA]);

    await expect(
      userService.updateProfile(ADA_ID, { avatarUploadId: LINUS_AVATAR }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(patches).toEqual([]);
  });

  it('does not write an empty patch', async () => {
    const { userService, patches } = createUserService([ADA]);

    const user = await userService.updateProfile(ADA_ID, {});

    expect(user.userName).toBe('Ada Lovelace');
    expect(patches).toEqual([]);
  });

  it('hands the replaced avatar to the cleanup', async () => {
    const { userService, cleanedUploadIds } = createUserService([ADA]);
    await userService.updateProfile(ADA_ID, { avatarUploadId: ADA_AVATAR });

    await userService.updateProfile(ADA_ID, { avatarUploadId: ADA_NEW_AVATAR });
    await userService.updateProfile(ADA_ID, { description: 'Mathematician' });

    expect(cleanedUploadIds).toEqual([null, ADA_AVATAR]);
  });

  it('answers 404 when the account is gone', async () => {
    const { userService } = createUserService([]);

    await expect(
      userService.updateProfile(ADA_ID, { userName: 'Ada' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('UserService.deleteAccount', () => {
  it('keeps the account when the password is wrong', async () => {
    const { userService, deletedUserIds } = createUserService([ADA]);

    await expect(
      userService.deleteAccount(ADA_ID, 'wrong-password'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(deletedUserIds).toEqual([]);
  });

  it('deletes the account, closes its sockets and forgets the cached profile', async () => {
    const { userService, deletedUserIds, disconnectedUserIds } =
      createUserService([ADA]);
    await userService.findProfile(ADA_ID, ADA_ID);

    await userService.deleteAccount(ADA_ID, PASSWORD);

    expect(deletedUserIds).toEqual([ADA_ID]);
    expect(disconnectedUserIds).toEqual([ADA_ID]);
    await expect(
      userService.findProfile(ADA_ID, ADA_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removes the images of the user', async () => {
    const removedPaths: string[] = [];
    const { userService } = createUserService([ADA], {
      removeDirectory: (path: string) => {
        removedPaths.push(path);
        return Promise.resolve();
      },
    });

    await userService.deleteAccount(ADA_ID, PASSWORD);

    expect(removedPaths).toEqual([`users/${ADA_ID}/`]);
  });

  it('still succeeds when the images cannot be removed', async () => {
    const { userService, deletedUserIds } = createUserService([ADA], {
      removeDirectory: () => Promise.reject(new Error('storage is down')),
    });

    await expect(
      userService.deleteAccount(ADA_ID, PASSWORD),
    ).resolves.toBeUndefined();
    expect(deletedUserIds).toEqual([ADA_ID]);
  });
});
