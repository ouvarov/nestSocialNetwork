import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';

import type { Cursor } from '@/common/pagination/cursor';
import { deleteChatsNobodySees, lockChats } from '@/database/chat-cleanup';
import { DRIZZLE, type Database } from '@/database/drizzle';
import { ChatMembers } from '@/database/schemas/chatMembers.schema';
import { Follows } from '@/database/schemas/follows.schema';
import { Uploads } from '@/database/schemas/uploads.schema';
import { Users, type User } from '@/database/schemas/users.schema';

type PublicUser = {
  id: string;
  userName: string;
  description: string;
  created: Date;
  imageKey: string | null;
  legacyImageUrl: string | null;
};

type PublicProfile = PublicUser & {
  followersCount: number;
  followingCount: number;
};

type PersonRow = PublicUser & {
  followersCount: number;
  isFollowedByMe: boolean;
  createdCursor: string;
};

type ProfilePatch = {
  userName?: string;
  description?: string;
  avatarUploadId?: string | null;
};

type ProfileUpdate = { previousAvatarUploadId: string | null };

const publicColumns = {
  id: Users.user_id,
  userName: Users.user_name,
  description: Users.description,
  created: Users.created,
  imageKey: Uploads.storage_key,
  legacyImageUrl: Users.image_url,
} satisfies Record<keyof PublicUser, unknown>;

const followersCount = sql<number>`(select count(*)::int from ${Follows} follower where follower.followee_id = ${Users}.user_id)`;
const followingCount = sql<number>`(select count(*)::int from ${Follows} followee where followee.follower_id = ${Users}.user_id)`;
const isFollowedBy = (viewerId: string) =>
  sql<boolean>`exists(select 1 from ${Follows} viewer_follow where viewer_follow.follower_id = ${viewerId} and viewer_follow.followee_id = ${Users}.user_id)`;

@Injectable()
export class UserDatabaseOrmService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(Users)
      .where(eq(sql`lower(${Users.email})`, email.toLowerCase()));

    return user ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(Users)
      .where(eq(Users.user_id, id));

    return user ?? null;
  }

  async findPublicProfile(id: string): Promise<PublicProfile | null> {
    const [profile] = await this.db
      .select({ ...publicColumns, followersCount, followingCount })
      .from(Users)
      .leftJoin(Uploads, eq(Uploads.upload_id, Users.avatar_upload_id))
      .where(eq(Users.user_id, id));

    return profile ?? null;
  }

  async exists(id: string): Promise<boolean> {
    const [user] = await this.db
      .select({ id: Users.user_id })
      .from(Users)
      .where(eq(Users.user_id, id));

    return user !== undefined;
  }

  findPeoplePage({
    viewerId,
    limit,
    cursor,
  }: {
    viewerId: string;
    limit: number;
    cursor?: Cursor;
  }): Promise<PersonRow[]> {
    const isBeforeCursor = cursor
      ? sql`(${Users.created}, ${Users.user_id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
      : undefined;

    return this.db
      .select({
        ...publicColumns,
        followersCount,
        isFollowedByMe: isFollowedBy(viewerId),
        createdCursor: sql<string>`${Users.created}::text`,
      })
      .from(Users)
      .leftJoin(Uploads, eq(Uploads.upload_id, Users.avatar_upload_id))
      .where(isBeforeCursor)
      .orderBy(desc(Users.created), desc(Users.user_id))
      .limit(limit + 1);
  }

  updateProfile(
    userId: string,
    { userName, description, avatarUploadId }: ProfilePatch,
  ): Promise<ProfileUpdate | null> {
    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ avatarUploadId: Users.avatar_upload_id })
        .from(Users)
        .where(eq(Users.user_id, userId))
        .for('update');

      if (!current) return null;

      await tx
        .update(Users)
        .set({
          user_name: userName,
          description,
          avatar_upload_id: avatarUploadId,
        })
        .where(eq(Users.user_id, userId));

      return { previousAvatarUploadId: current.avatarUploadId };
    });
  }

  deleteUser(userId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const memberships = await tx
        .select({ chatId: ChatMembers.chat_id })
        .from(ChatMembers)
        .where(eq(ChatMembers.user_id, userId));
      const chatIds = memberships.map(({ chatId }) => chatId);
      await lockChats(tx, chatIds);

      const deleted = await tx
        .delete(Users)
        .where(eq(Users.user_id, userId))
        .returning({ id: Users.user_id });

      if (deleted.length === 0) return false;

      await deleteChatsNobodySees(tx, chatIds);
      return true;
    });
  }
}

export type { PersonRow, ProfilePatch, PublicProfile, PublicUser };
