import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { ChatDatabaseService } from '@/database/chat-database.service';

import { ChatService } from '../chat.service';

const ADA = 'ada';
const LINUS = 'linus';
const GRACE = 'grace';

const createChatStore = () => {
  const members = new Map<string, Set<string>>();
  const names = new Map<string, string>();

  const store = {
    isMember: (chatId: string, userId: string) =>
      Promise.resolve(members.get(chatId)?.has(userId) ?? false),
    findChatWithExactMembers: (memberIds: string[]) => {
      const match = [...members.entries()].find(
        ([, chatMembers]) =>
          chatMembers.size === memberIds.length &&
          memberIds.every((id) => chatMembers.has(id)),
      );
      return Promise.resolve(match?.[0] ?? null);
    },
    createChat: (memberIds: string[]) => {
      const chatId = randomUUID();
      members.set(chatId, new Set(memberIds));
      names.set(chatId, memberIds.join(', '));
      return Promise.resolve(chatId);
    },
    getChatsOfUser: (userId: string) =>
      Promise.resolve(
        [...members.entries()]
          .filter(([, chatMembers]) => chatMembers.has(userId))
          .map(([chatId]) => ({ chatId, chatName: names.get(chatId) ?? null })),
      ),
    getChatWithMessages: (chatId: string) =>
      Promise.resolve(
        members.has(chatId)
          ? { chatName: names.get(chatId) ?? '', messages: [] }
          : null,
      ),
    deleteChat: (chatId: string) =>
      Promise.resolve(members.delete(chatId) ? chatId : null),
    updateChatName: (chatId: string, chatName: string) => {
      if (!members.has(chatId)) return Promise.resolve(null);
      names.set(chatId, chatName);
      return Promise.resolve({ chatId, chatName });
    },
  };

  return { store, members };
};

const createChatService = () => {
  const { store, members } = createChatStore();
  const chatService = new ChatService(store as unknown as ChatDatabaseService);

  return { chatService, members };
};

describe('ChatService', () => {
  describe('create', () => {
    it('always adds the caller and drops duplicate ids', async () => {
      const { chatService, members } = createChatService();

      const chatId = await chatService.create(ADA, [LINUS, LINUS]);

      expect([...(members.get(chatId) ?? [])].sort()).toEqual([ADA, LINUS]);
    });

    it('does not let the caller create a chat between other people', async () => {
      const { chatService, members } = createChatService();

      const chatId = await chatService.create(ADA, [LINUS, GRACE]);

      expect(members.get(chatId)?.has(ADA)).toBe(true);
    });

    it('returns the existing chat for the same members', async () => {
      const { chatService } = createChatService();

      const first = await chatService.create(ADA, [LINUS]);
      const second = await chatService.create(LINUS, [ADA]);

      expect(second).toBe(first);
    });

    it('does not reuse a group chat for a direct message', async () => {
      const { chatService } = createChatService();

      const groupChat = await chatService.create(ADA, [LINUS, GRACE]);
      const directChat = await chatService.create(ADA, [LINUS]);

      expect(directChat).not.toBe(groupChat);
    });

    it('rejects a chat with only the caller', async () => {
      const { chatService } = createChatService();

      await expect(chatService.create(ADA, [ADA])).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('access', () => {
    it('lists only the chats the caller is a member of', async () => {
      const { chatService } = createChatService();
      const ownChat = await chatService.create(ADA, [LINUS]);
      await chatService.create(LINUS, [GRACE]);

      const chats = await chatService.findAll(ADA);

      expect(chats.map(({ chatId }) => chatId)).toEqual([ownChat]);
    });

    it.each([
      [
        'read',
        (service: ChatService, chatId: string) =>
          service.findOne(GRACE, chatId),
      ],
      [
        'delete',
        (service: ChatService, chatId: string) =>
          service.deleteChat(GRACE, chatId),
      ],
      [
        'rename',
        (service: ChatService, chatId: string) =>
          service.updateChatName(GRACE, { chatId, newChatName: 'hijacked' }),
      ],
    ])(
      'answers 404 when a non-member tries to %s a chat',
      async (_action, act) => {
        const { chatService, members } = createChatService();
        const chatId = await chatService.create(ADA, [LINUS]);

        await expect(act(chatService, chatId)).rejects.toBeInstanceOf(
          NotFoundException,
        );
        expect(members.has(chatId)).toBe(true);
      },
    );

    it('lets a member read the chat', async () => {
      const { chatService } = createChatService();
      const chatId = await chatService.create(ADA, [LINUS]);

      await expect(chatService.findOne(LINUS, chatId)).resolves.toMatchObject({
        messages: [],
      });
    });
  });
});
