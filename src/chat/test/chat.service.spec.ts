import {
  BadRequestException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type {
  ChatDatabaseService,
  ChatPeer,
} from '@/database/chat-database.service';
import type { UserService } from '@/user/user.service';

import { ChatService } from '../chat.service';

const ADA = '00000000-0000-4000-8000-00000000000a';
const LINUS = '00000000-0000-4000-8000-00000000000b';
const GRACE = '00000000-0000-4000-8000-00000000000c';

const peerOf = (userId: string): ChatPeer => ({
  id: userId,
  userName: userId,
  imageUrl: null,
});

const createChatStore = () => {
  const chats = new Map<string, { pairKey: string; members: Set<string> }>();

  const store = {
    isMember: (chatId: string, userId: string) =>
      Promise.resolve(chats.get(chatId)?.members.has(userId) ?? false),
    findMemberIds: (chatId: string) =>
      Promise.resolve([...(chats.get(chatId)?.members ?? [])]),
    findOrCreateDirectChat: (userId: string, peerId: string) => {
      const pairKey = [userId, peerId].sort().join(':');
      const existing = [...chats.entries()].find(
        ([, chat]) => chat.pairKey === pairKey,
      );
      if (existing) return Promise.resolve(existing[0]);

      const chatId = randomUUID();
      chats.set(chatId, { pairKey, members: new Set([userId, peerId]) });
      return Promise.resolve(chatId);
    },
    findChatHeader: (chatId: string, userId: string) => {
      const members = chats.get(chatId)?.members;
      if (!members?.has(userId)) return Promise.resolve(null);

      const peerId = [...members].find((id) => id !== userId);
      return Promise.resolve({
        chatId,
        peer: peerId ? peerOf(peerId) : null,
      });
    },
    findMessages: () => Promise.resolve([]),
    clearChat: (chatId: string, userId: string) =>
      Promise.resolve(chats.get(chatId)?.members.has(userId) ?? false),
  };

  return { store, chats };
};

const createChatService = (existingUserIds = [ADA, LINUS, GRACE]) => {
  const { store, chats } = createChatStore();
  const userService = {
    exists: (id: string) => Promise.resolve(existingUserIds.includes(id)),
  };
  const chatService = new ChatService(
    store as unknown as ChatDatabaseService,
    userService as unknown as UserService,
  );
  const deleteAccount = (chatId: string, userId: string) =>
    chats.get(chatId)?.members.delete(userId);

  return { chatService, chats, deleteAccount };
};

describe('ChatService', () => {
  describe('create', () => {
    it('creates one direct chat per pair whoever starts it', async () => {
      const { chatService, chats } = createChatService();

      const first = await chatService.create(ADA, LINUS);
      const second = await chatService.create(LINUS, ADA);

      expect(second).toBe(first);
      expect([...(chats.get(first)?.members ?? [])].sort()).toEqual([
        ADA,
        LINUS,
      ]);
    });

    it('treats an upper-case id as the same person', async () => {
      const { chatService } = createChatService();

      const first = await chatService.create(ADA, LINUS);

      await expect(chatService.create(ADA, LINUS.toUpperCase())).resolves.toBe(
        first,
      );
    });

    it('rejects a chat with yourself', async () => {
      const { chatService } = createChatService();

      await expect(chatService.create(ADA, ADA)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('answers 404 for a user that does not exist', async () => {
      const { chatService, chats } = createChatService([ADA]);

      await expect(chatService.create(ADA, LINUS)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(chats.size).toBe(0);
    });
  });

  describe('findOne', () => {
    it('shows the other person and allows sending', async () => {
      const { chatService } = createChatService();
      const chatId = await chatService.create(ADA, LINUS);

      await expect(chatService.findOne(ADA, chatId)).resolves.toEqual({
        chatId,
        peer: peerOf(LINUS),
        canSend: true,
      });
    });

    it('has no peer and no sending once the other person is gone', async () => {
      const { chatService, deleteAccount } = createChatService();
      const chatId = await chatService.create(ADA, LINUS);
      deleteAccount(chatId, LINUS);

      await expect(chatService.findOne(ADA, chatId)).resolves.toEqual({
        chatId,
        peer: null,
        canSend: false,
      });
    });
  });

  describe('access', () => {
    it.each([
      [
        'read',
        (service: ChatService, chatId: string) =>
          service.findOne(GRACE, chatId),
      ],
      [
        'read the messages of',
        (service: ChatService, chatId: string) =>
          service.findMessages(GRACE, chatId, {}),
      ],
      [
        'clear',
        (service: ChatService, chatId: string) => service.clear(GRACE, chatId),
      ],
      [
        'send to',
        (service: ChatService, chatId: string) =>
          service.assertCanSend(GRACE, chatId),
      ],
    ])('answers 404 when a non-member tries to %s a chat', async (_, act) => {
      const { chatService } = createChatService();
      const chatId = await chatService.create(ADA, LINUS);

      await expect(act(chatService, chatId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('refuses to send once the other person deleted their account', async () => {
      const { chatService, deleteAccount } = createChatService();
      const chatId = await chatService.create(ADA, LINUS);
      deleteAccount(chatId, LINUS);

      await expect(chatService.assertCanSend(ADA, chatId)).rejects.toThrow(
        new GoneException('User deleted'),
      );
    });

    it('lets both members send', async () => {
      const { chatService } = createChatService();
      const chatId = await chatService.create(ADA, LINUS);

      await expect(
        chatService.assertCanSend(LINUS, chatId),
      ).resolves.toBeUndefined();
    });
  });
});
