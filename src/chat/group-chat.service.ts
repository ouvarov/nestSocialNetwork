import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  GroupChatDatabaseService,
  type GroupEditor,
  type LockedChat,
  type LockedMember,
} from '@/database/group-chat-database.service';
import { UserSocketsService } from '@/realtime/user-sockets.service';

import {
  type AssignableRole,
  MAX_GROUP_MEMBERS,
  canManageGroup,
  canRemove,
  isOwner,
} from './group-rules';

type GroupEdit = {
  group: LockedChat;
  actor: LockedMember;
  editor: GroupEditor;
};

const toUniqueLowerCase = (ids: string[]) => [
  ...new Set(ids.map((id) => id.toLowerCase())),
];

const memberIdsOf = ({ members }: LockedChat) =>
  members.map(({ userId }) => userId);

const findMember = ({ members }: LockedChat, userId: string): LockedMember => {
  const member = members.find((candidate) => candidate.userId === userId);
  if (!member) throw new NotFoundException('Member not found');

  return member;
};

@Injectable()
export class GroupChatService {
  constructor(
    private readonly database: GroupChatDatabaseService,
    private readonly userSocketsService: UserSocketsService,
  ) {}

  async create(
    ownerId: string,
    title: string,
    memberIds: string[],
  ): Promise<string> {
    const others = toUniqueLowerCase(memberIds);

    if (others.includes(ownerId)) {
      throw new BadRequestException('You are in the group already');
    }
    if ((await this.database.countExistingUsers(others)) !== others.length) {
      throw new NotFoundException('User not found');
    }

    const chatId = await this.database.createGroup(ownerId, title, others);
    this.userSocketsService.notifyChatsChanged([ownerId, ...others]);

    return chatId;
  }

  async rename(actorId: string, chatId: string, title: string): Promise<void> {
    const memberIds = await this.edit(
      actorId,
      chatId,
      async ({ group, actor, editor }) => {
        if (!canManageGroup(actor.role)) throw new ForbiddenException();

        await editor.rename(title);
        return memberIdsOf(group);
      },
    );

    this.userSocketsService.notifyGroupChanged(memberIds, chatId);
  }

  async addMembers(
    actorId: string,
    chatId: string,
    userIds: string[],
  ): Promise<void> {
    const memberIds = await this.edit(
      actorId,
      chatId,
      async ({ group, actor, editor }) => {
        if (!canManageGroup(actor.role)) throw new ForbiddenException();

        const present = memberIdsOf(group);
        const added = toUniqueLowerCase(userIds).filter(
          (id) => !present.includes(id),
        );

        if (present.length + added.length > MAX_GROUP_MEMBERS) {
          throw new BadRequestException(
            `A group holds up to ${MAX_GROUP_MEMBERS} people`,
          );
        }
        if (
          added.length > 0 &&
          (await editor.countExistingUsers(added)) !== added.length
        ) {
          throw new NotFoundException('User not found');
        }

        await editor.addMembers(added);
        return [...present, ...added];
      },
    );

    this.userSocketsService.notifyGroupChanged(memberIds, chatId);
  }

  async removeMember(
    actorId: string,
    chatId: string,
    userId: string,
  ): Promise<void> {
    const targetId = userId.toLowerCase();
    const memberIds = await this.edit(
      actorId,
      chatId,
      async ({ group, actor, editor }) => {
        if (targetId === actorId) {
          if (isOwner(actor.role)) await editor.handOverOwnership(actorId);
        } else if (!canRemove(actor.role, findMember(group, targetId).role)) {
          throw new ForbiddenException();
        }

        await editor.removeMember(targetId);
        return memberIdsOf(group);
      },
    );

    this.userSocketsService.removeFromChat(targetId, chatId);
    this.userSocketsService.notifyGroupChanged(memberIds, chatId);
  }

  async setRole(
    actorId: string,
    chatId: string,
    userId: string,
    role: AssignableRole,
  ): Promise<void> {
    const targetId = userId.toLowerCase();
    const memberIds = await this.edit(
      actorId,
      chatId,
      async ({ group, actor, editor }) => {
        if (!isOwner(actor.role)) throw new ForbiddenException();
        if (targetId === actorId) {
          throw new BadRequestException('Hand the group over instead');
        }

        findMember(group, targetId);
        await editor.setRole(targetId, role);
        return memberIdsOf(group);
      },
    );

    this.userSocketsService.notifyGroupChanged(memberIds, chatId);
  }

  async transferOwner(
    actorId: string,
    chatId: string,
    userId: string,
  ): Promise<void> {
    const targetId = userId.toLowerCase();
    const memberIds = await this.edit(
      actorId,
      chatId,
      async ({ group, actor, editor }) => {
        if (!isOwner(actor.role)) throw new ForbiddenException();
        if (targetId === actorId) {
          throw new BadRequestException('You own the group already');
        }

        findMember(group, targetId);
        await editor.setRole(actorId, 'moderator');
        await editor.setRole(targetId, 'owner');
        return memberIdsOf(group);
      },
    );

    this.userSocketsService.notifyGroupChanged(memberIds, chatId);
  }

  async deleteGroup(actorId: string, chatId: string): Promise<void> {
    const memberIds = await this.edit(
      actorId,
      chatId,
      async ({ group, actor, editor }) => {
        if (!isOwner(actor.role)) throw new ForbiddenException();

        await editor.deleteGroup();
        return memberIdsOf(group);
      },
    );

    this.userSocketsService.notifyGroupChanged(memberIds, chatId);
  }

  private edit<Result>(
    actorId: string,
    chatId: string,
    work: (edit: GroupEdit) => Promise<Result>,
  ): Promise<Result> {
    return this.database.editChat(chatId, async (group, editor) => {
      const actor = group?.members.find(({ userId }) => userId === actorId);

      if (!group || !actor) throw new NotFoundException('Chat not found');
      if (group.kind !== 'group') {
        throw new BadRequestException('This is not a group');
      }

      return work({ group, actor, editor });
    });
  }
}
