import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { MemoryCacheService } from '@/cache/memory-cache.service';
import type {
  PublicUser,
  UserDatabaseOrmService,
} from '@/database/user-database.service';
import type { UserSocketsService } from '@/realtime/user-sockets.service';
import type { StorageService } from '@/storage/storage.service';

import { UserService } from '../user.service';

const ADA: PublicUser = {
  user_id: '7f6b2c1e-0000-4000-8000-000000000001',
  user_name: 'Ada Lovelace',
  image_url: null,
  description: '',
  created: new Date('2026-01-01T00:00:00Z'),
};

const PASSWORD = 'correct-horse-battery';
const TEST_HASH_ROUNDS = 4;

const createUserService = (
  users: PublicUser[],
  storage: Partial<StorageService> = {},
) => {
  let databaseReads = 0;
  const deletedUserIds: string[] = [];
  const disconnectedUserIds: string[] = [];
  const passwordHash = bcrypt.hashSync(PASSWORD, TEST_HASH_ROUNDS);
  const findUser = (id: string) =>
    users.find((user) => user.user_id === id && !deletedUserIds.includes(id));

  const database = {
    findPublicById: (id: string) => {
      databaseReads += 1;
      return Promise.resolve(findUser(id) ?? null);
    },
    findById: (id: string) => {
      const user = findUser(id);
      return Promise.resolve(user ? { ...user, password: passwordHash } : null);
    },
    deleteUser: (id: string) => {
      deletedUserIds.push(id);
      return Promise.resolve(true);
    },
  } as unknown as UserDatabaseOrmService;
  const userSockets = {
    disconnectUser: (id: string) => disconnectedUserIds.push(id),
  } as unknown as UserSocketsService;
  const storageService = {
    removeDirectory: () => Promise.resolve(),
    ...storage,
  } as unknown as StorageService;

  return {
    userService: new UserService(
      database,
      new MemoryCacheService(),
      userSockets,
      storageService,
    ),
    databaseReads: () => databaseReads,
    deletedUserIds,
    disconnectedUserIds,
  };
};

describe('UserService.findProfile', () => {
  it('reads the profile from the database once and then from the cache', async () => {
    const { userService, databaseReads } = createUserService([ADA]);

    const first = await userService.findProfile(ADA.user_id);
    const second = await userService.findProfile(ADA.user_id);

    expect(first.userName).toBe('Ada Lovelace');
    expect(second).toEqual(first);
    expect(databaseReads()).toBe(1);
  });

  it('does not cache a missing user', async () => {
    const { userService, databaseReads } = createUserService([]);

    await expect(userService.findProfile(ADA.user_id)).rejects.toThrow(
      NotFoundException,
    );
    await expect(userService.findProfile(ADA.user_id)).rejects.toThrow(
      NotFoundException,
    );
    expect(databaseReads()).toBe(2);
  });
});

describe('UserService.deleteAccount', () => {
  it('keeps the account when the password is wrong', async () => {
    const { userService, deletedUserIds } = createUserService([ADA]);

    await expect(
      userService.deleteAccount(ADA.user_id, 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(deletedUserIds).toEqual([]);
  });

  it('deletes the account, closes its sockets and forgets the cached profile', async () => {
    const { userService, deletedUserIds, disconnectedUserIds } =
      createUserService([ADA]);
    await userService.findProfile(ADA.user_id);

    await userService.deleteAccount(ADA.user_id, PASSWORD);

    expect(deletedUserIds).toEqual([ADA.user_id]);
    expect(disconnectedUserIds).toEqual([ADA.user_id]);
    await expect(userService.findProfile(ADA.user_id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('removes the images of the user', async () => {
    const removedPaths: string[] = [];
    const { userService } = createUserService([ADA], {
      removeDirectory: (path: string) => {
        removedPaths.push(path);
        return Promise.resolve();
      },
    });

    await userService.deleteAccount(ADA.user_id, PASSWORD);

    expect(removedPaths).toEqual([`users/${ADA.user_id}/`]);
  });

  it('still succeeds when the images cannot be removed', async () => {
    const { userService, deletedUserIds } = createUserService([ADA], {
      removeDirectory: () => Promise.reject(new Error('storage is down')),
    });

    await expect(
      userService.deleteAccount(ADA.user_id, PASSWORD),
    ).resolves.toBeUndefined();
    expect(deletedUserIds).toEqual([ADA.user_id]);
  });
});
