import { NotFoundException } from '@nestjs/common';

import { MemoryCacheService } from '@/cache/memory-cache.service';
import type {
  PublicUser,
  UserDatabaseOrmService,
} from '@/database/user-database.service';

import { UserService } from '../user.service';

const ADA: PublicUser = {
  user_id: '7f6b2c1e-0000-4000-8000-000000000001',
  user_name: 'Ada Lovelace',
  image_url: null,
  description: '',
  created: new Date('2026-01-01T00:00:00Z'),
};

const createUserService = (users: PublicUser[]) => {
  let databaseReads = 0;
  const database = {
    findPublicById: (id: string) => {
      databaseReads += 1;
      return Promise.resolve(users.find((user) => user.user_id === id) ?? null);
    },
  } as unknown as UserDatabaseOrmService;

  return {
    userService: new UserService(database, new MemoryCacheService()),
    databaseReads: () => databaseReads,
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
