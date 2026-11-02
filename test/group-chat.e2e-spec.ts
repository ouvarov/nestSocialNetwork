import type { NestExpressApplication } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import type { Socket } from 'socket.io-client';

import type {
  ChatDto,
  ChatIdDto,
  ChatSummaryDto,
  MessagePageDto,
} from '@/chat/dto/chat-response.dto';

import {
  api,
  bearer,
  connectSocket,
  createChat,
  createTestApp,
  deleteAccount,
  emitWithAck,
  nextEvent,
  registerUser,
  sendMessage,
  type TestUser,
} from './support';

let app: NestExpressApplication;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

const createGroup = async (owner: TestUser, members: TestUser[]) => {
  const response = await api(app)
    .post('/api/chat/group')
    .set(bearer(owner))
    .send({ title: 'Team', memberIds: members.map(({ id }) => id) })
    .expect(201);

  return (response.body as ChatIdDto).chatId;
};

const groupOf = async (user: TestUser, chatId: string) => {
  const response = await api(app)
    .get(`/api/chat/find/${chatId}`)
    .set(bearer(user))
    .expect(200);

  return response.body as ChatDto;
};

const summaryOf = async (user: TestUser, chatId: string) => {
  const response = await api(app)
    .get('/api/chat')
    .set(bearer(user))
    .expect(200);

  return (response.body as ChatSummaryDto[]).find(
    (chat) => chat.chatId === chatId,
  );
};

const historyOf = async (user: TestUser, chatId: string) => {
  const response = await api(app)
    .get(`/api/chat/${chatId}/messages`)
    .set(bearer(user))
    .expect(200);

  return (response.body as MessagePageDto).items;
};

const rename = (user: TestUser, chatId: string, title = 'Renamed') =>
  api(app).patch(`/api/chat/${chatId}`).set(bearer(user)).send({ title });

const addMembers = (user: TestUser, chatId: string, people: TestUser[]) =>
  api(app)
    .post(`/api/chat/${chatId}/members`)
    .set(bearer(user))
    .send({ userIds: people.map(({ id }) => id) });

const removeMember = (user: TestUser, chatId: string, target: TestUser) =>
  api(app).delete(`/api/chat/${chatId}/members/${target.id}`).set(bearer(user));

const setRole = (
  user: TestUser,
  chatId: string,
  target: TestUser,
  role: string,
) =>
  api(app)
    .put(`/api/chat/${chatId}/members/${target.id}/role`)
    .set(bearer(user))
    .send({ role });

const transferOwner = (user: TestUser, chatId: string, target: TestUser) =>
  api(app)
    .put(`/api/chat/${chatId}/owner`)
    .set(bearer(user))
    .send({ userId: target.id });

const deleteGroup = (user: TestUser, chatId: string) =>
  api(app).delete(`/api/chat/${chatId}/group`).set(bearer(user));

const setUpGroup = async () => {
  const [owner, moderator, otherModerator, member, otherMember, outsider] =
    await Promise.all(
      ['Olga', 'Mira', 'Max', 'Nina', 'Nick', 'Eve'].map((name) =>
        registerUser(app, name),
      ),
    );
  const chatId = await createGroup(owner, [
    moderator,
    otherModerator,
    member,
    otherMember,
  ]);
  await setRole(owner, chatId, moderator, 'moderator').expect(204);
  await setRole(owner, chatId, otherModerator, 'moderator').expect(204);

  return {
    chatId,
    owner,
    moderator,
    otherModerator,
    member,
    otherMember,
    outsider,
  };
};

const roleOf = async (viewer: TestUser, chatId: string, user: TestUser) => {
  const { members } = await groupOf(viewer, chatId);

  return members.find(({ id }) => id === user.id)?.role;
};

const connected = async (user: TestUser, chatId: string): Promise<Socket> => {
  const socket = connectSocket(app, user.accessToken);
  await nextEvent(socket, 'connect');
  await emitWithAck(socket, 'joinChat', { chatId });

  return socket;
};

describe('creating a group', () => {
  it('makes you the owner and lists it for everyone', async () => {
    const [ada, bob, carol] = await Promise.all([
      registerUser(app, 'Ada'),
      registerUser(app, 'Bob'),
      registerUser(app, 'Carol'),
    ]);

    const chatId = await createGroup(ada, [bob, carol]);

    expect(await groupOf(bob, chatId)).toMatchObject({
      kind: 'group',
      title: 'Team',
      myRole: 'member',
      peer: null,
      canSend: true,
    });
    expect(await roleOf(bob, chatId, ada)).toBe('owner');
    expect(await summaryOf(carol, chatId)).toMatchObject({
      kind: 'group',
      title: 'Team',
      memberCount: 3,
      peer: null,
      unreadCount: 0,
    });
  });

  it('lists a group once, however many people are in it', async () => {
    const { chatId, member } = await setUpGroup();

    const response = await api(app)
      .get('/api/chat')
      .set(bearer(member))
      .expect(200);

    expect(
      (response.body as ChatSummaryDto[]).filter(
        (chat) => chat.chatId === chatId,
      ),
    ).toHaveLength(1);
  });

  it('trims the title and rejects an empty or too long one', async () => {
    const [ada, bob] = await Promise.all([
      registerUser(app, 'Ada'),
      registerUser(app, 'Bob'),
    ]);
    const create = (title: string) =>
      api(app)
        .post('/api/chat/group')
        .set(bearer(ada))
        .send({ title, memberIds: [bob.id] });

    await create('   ').expect(400);
    await create('x'.repeat(101)).expect(400);

    const response = await create('  Spaced  ').expect(201);
    const { chatId } = response.body as ChatIdDto;
    expect((await groupOf(ada, chatId)).title).toBe('Spaced');
  });

  it('rejects yourself, nobody, or someone who does not exist', async () => {
    const [ada, bob] = await Promise.all([
      registerUser(app, 'Ada'),
      registerUser(app, 'Bob'),
    ]);
    const create = (memberIds: string[]) =>
      api(app)
        .post('/api/chat/group')
        .set(bearer(ada))
        .send({ title: 'Team', memberIds });

    await create([]).expect(400);
    await create([ada.id, bob.id]).expect(400);
    await create([ada.id.toUpperCase(), bob.id]).expect(400);
    await create([randomUUID()]).expect(404);
  });
});

describe('permissions', () => {
  it('lets the owner and moderators rename, but not members', async () => {
    const { chatId, owner, moderator, member, outsider } = await setUpGroup();

    await rename(owner, chatId, 'By owner').expect(204);
    await rename(moderator, chatId, 'By moderator').expect(204);
    await rename(member, chatId).expect(403);
    await rename(outsider, chatId).expect(404);

    expect((await groupOf(member, chatId)).title).toBe('By moderator');
  });

  it('lets the owner and moderators add people, but not members', async () => {
    const { chatId, owner, moderator, member, outsider } = await setUpGroup();
    const [first, second, third] = await Promise.all([
      registerUser(app, 'First'),
      registerUser(app, 'Second'),
      registerUser(app, 'Third'),
    ]);

    await addMembers(owner, chatId, [first]).expect(204);
    await addMembers(moderator, chatId, [second]).expect(204);
    await addMembers(member, chatId, [third]).expect(403);
    await addMembers(outsider, chatId, [third]).expect(404);

    expect(await summaryOf(second, chatId)).toBeDefined();
    expect(await summaryOf(third, chatId)).toBeUndefined();
  });

  it('skips people who are already in and rejects unknown ones', async () => {
    const { chatId, owner, member } = await setUpGroup();

    await addMembers(owner, chatId, [member]).expect(204);
    await api(app)
      .post(`/api/chat/${chatId}/members`)
      .set(bearer(owner))
      .send({ userIds: [randomUUID()] })
      .expect(404);

    expect((await summaryOf(owner, chatId))?.memberCount).toBe(5);
  });

  it('lets a moderator remove members, but not other moderators or the owner', async () => {
    const { chatId, owner, moderator, otherModerator, member } =
      await setUpGroup();

    await removeMember(moderator, chatId, otherModerator).expect(403);
    await removeMember(moderator, chatId, owner).expect(403);
    await removeMember(moderator, chatId, member).expect(204);

    await groupOf(otherModerator, chatId);
    await api(app)
      .get(`/api/chat/find/${chatId}`)
      .set(bearer(member))
      .expect(404);
  });

  it('lets the owner remove a moderator', async () => {
    const { chatId, owner, moderator } = await setUpGroup();

    await removeMember(owner, chatId, moderator).expect(204);

    expect(await summaryOf(moderator, chatId)).toBeUndefined();
  });

  it('does not let a member remove anyone', async () => {
    const { chatId, member, otherMember } = await setUpGroup();

    await removeMember(member, chatId, otherMember).expect(403);
  });

  it('answers 404 when removing someone who is not in the group', async () => {
    const { chatId, owner, outsider } = await setUpGroup();

    await removeMember(owner, chatId, outsider).expect(404);
  });

  it('lets only the owner set roles', async () => {
    const { chatId, owner, moderator, member, otherMember, outsider } =
      await setUpGroup();

    await setRole(moderator, chatId, member, 'moderator').expect(403);
    await setRole(member, chatId, otherMember, 'moderator').expect(403);
    await setRole(owner, chatId, outsider, 'moderator').expect(404);
    await setRole(owner, chatId, member, 'owner').expect(400);
    await setRole(owner, chatId, owner, 'member').expect(400);

    await setRole(owner, chatId, member, 'moderator').expect(204);
    expect(await roleOf(owner, chatId, member)).toBe('moderator');

    await setRole(owner, chatId, member, 'member').expect(204);
    expect(await roleOf(owner, chatId, member)).toBe('member');
  });

  it('lets only the owner hand the group over', async () => {
    const { chatId, owner, moderator, member, outsider } = await setUpGroup();

    await transferOwner(moderator, chatId, member).expect(403);
    await transferOwner(owner, chatId, outsider).expect(404);
    await transferOwner(owner, chatId, owner).expect(400);

    await transferOwner(owner, chatId, member).expect(204);

    expect(await roleOf(owner, chatId, member)).toBe('owner');
    expect(await roleOf(owner, chatId, owner)).toBe('moderator');
    await rename(owner, chatId).expect(204);
    await deleteGroup(owner, chatId).expect(403);
  });

  it('lets only the owner delete the group, for everyone', async () => {
    const { chatId, owner, moderator, member, outsider } = await setUpGroup();

    await deleteGroup(moderator, chatId).expect(403);
    await deleteGroup(member, chatId).expect(403);
    await deleteGroup(outsider, chatId).expect(404);

    await deleteGroup(owner, chatId).expect(204);

    expect(await summaryOf(member, chatId)).toBeUndefined();
    await api(app)
      .get(`/api/chat/find/${chatId}`)
      .set(bearer(owner))
      .expect(404);
  });

  it('refuses group actions on a direct chat', async () => {
    const [ada, bob, carol] = await Promise.all([
      registerUser(app, 'Ada'),
      registerUser(app, 'Bob'),
      registerUser(app, 'Carol'),
    ]);
    const chatId = await createChat(app, ada, bob);

    await rename(ada, chatId).expect(400);
    await addMembers(ada, chatId, [carol]).expect(400);
    await removeMember(ada, chatId, bob).expect(400);
    await deleteGroup(ada, chatId).expect(400);
    await rename(carol, chatId).expect(404);

    const { members, kind, title } = await groupOf(ada, chatId);
    expect({ members, kind, title }).toEqual({
      members: [],
      kind: 'direct',
      title: null,
    });
  });
});

describe('the member limit', () => {
  it('holds fifty people and refuses the fifty-first', async () => {
    const owner = await registerUser(app, 'Olga');
    const people: TestUser[] = [];
    for (let index = 0; index < 50; index += 1) {
      people.push(await registerUser(app, `Person ${index}`));
    }
    const chatId = await createGroup(owner, people.slice(0, 48));

    await addMembers(owner, chatId, [people[48]]).expect(204);
    await addMembers(owner, chatId, [people[49]]).expect(400);

    expect((await summaryOf(owner, chatId))?.memberCount).toBe(50);
  }, 120_000);
});

describe('leaving', () => {
  it('lets a member leave and keeps their messages with their name', async () => {
    const { chatId, owner, member } = await setUpGroup();
    await sendMessage(app, member, chatId, 'Bye all');

    await removeMember(member, chatId, member).expect(204);

    expect(await summaryOf(member, chatId)).toBeUndefined();
    expect(await historyOf(owner, chatId)).toMatchObject([
      { content: 'Bye all', senderId: member.id, senderName: 'Nina' },
    ]);
  });

  it('hands an owner who leaves over to the oldest moderator', async () => {
    const { chatId, owner, moderator, otherModerator, member } =
      await setUpGroup();
    const { members } = await groupOf(owner, chatId);
    const oldestModeratorId = members.find(({ id }) =>
      [moderator.id, otherModerator.id].includes(id),
    )?.id;

    await removeMember(owner, chatId, owner).expect(204);

    const after = await groupOf(member, chatId);
    expect(after.members.find(({ role }) => role === 'owner')?.id).toBe(
      oldestModeratorId,
    );
    expect(after.members.filter(({ role }) => role === 'owner')).toHaveLength(
      1,
    );
    expect(after.members.some(({ id }) => id === owner.id)).toBe(false);
  });

  it('hands over to a member when there are no moderators', async () => {
    const [ada, bob, carol] = await Promise.all([
      registerUser(app, 'Ada'),
      registerUser(app, 'Bob'),
      registerUser(app, 'Carol'),
    ]);
    const chatId = await createGroup(ada, [bob, carol]);

    await removeMember(ada, chatId, ada).expect(204);

    const { members } = await groupOf(bob, chatId);
    expect(members.filter(({ role }) => role === 'owner')).toHaveLength(1);
  });

  it('deletes the group when the last person leaves', async () => {
    const [ada, bob] = await Promise.all([
      registerUser(app, 'Ada'),
      registerUser(app, 'Bob'),
    ]);
    const chatId = await createGroup(ada, [bob]);

    await removeMember(bob, chatId, bob).expect(204);
    await removeMember(ada, chatId, ada).expect(204);

    await addMembers(ada, chatId, [bob]).expect(404);
    expect(await summaryOf(ada, chatId)).toBeUndefined();
  });

  it('hands over when the owner deletes their account', async () => {
    const [ada, bob, carol] = await Promise.all([
      registerUser(app, 'Ada'),
      registerUser(app, 'Bob'),
      registerUser(app, 'Carol'),
    ]);
    const chatId = await createGroup(ada, [bob, carol]);
    await sendMessage(app, ada, chatId, 'Before I go');

    await deleteAccount(app, ada);

    const { members, canSend } = await groupOf(bob, chatId);
    expect(canSend).toBe(true);
    expect(members).toHaveLength(2);
    expect(members.filter(({ role }) => role === 'owner')).toHaveLength(1);
    expect(await historyOf(bob, chatId)).toMatchObject([
      { content: 'Before I go', senderId: null, senderName: null },
    ]);
  });

  it('deletes the group when its only member deletes their account', async () => {
    const [ada, bob] = await Promise.all([
      registerUser(app, 'Ada'),
      registerUser(app, 'Bob'),
    ]);
    const chatId = await createGroup(ada, [bob]);
    await removeMember(bob, chatId, bob).expect(204);

    await deleteAccount(app, ada);

    await addMembers(bob, chatId, [bob]).expect(404);
  });

  it('keeps a group where everyone cleared the history', async () => {
    const [ada, bob] = await Promise.all([
      registerUser(app, 'Ada'),
      registerUser(app, 'Bob'),
    ]);
    const chatId = await createGroup(ada, [bob]);
    await sendMessage(app, ada, chatId, 'Hi');

    await api(app).delete(`/api/chat/${chatId}`).set(bearer(ada)).expect(204);
    await api(app).delete(`/api/chat/${chatId}`).set(bearer(bob)).expect(204);

    expect(await summaryOf(ada, chatId)).toMatchObject({
      lastMessage: null,
      unreadCount: 0,
    });
  });
});

describe('history for someone new', () => {
  it('shows only messages from after they joined, with no old preview', async () => {
    const [ada, bob, carol] = await Promise.all([
      registerUser(app, 'Ada'),
      registerUser(app, 'Bob'),
      registerUser(app, 'Carol'),
    ]);
    const chatId = await createGroup(ada, [bob]);
    await sendMessage(app, ada, chatId, 'Secret plans');

    await addMembers(ada, chatId, [carol]).expect(204);

    expect(await summaryOf(carol, chatId)).toMatchObject({
      lastMessage: null,
      lastMessageAt: null,
      unreadCount: 0,
    });
    expect(await historyOf(carol, chatId)).toEqual([]);

    await sendMessage(app, bob, chatId, 'Welcome Carol');

    expect(await summaryOf(carol, chatId)).toMatchObject({
      lastMessage: { content: 'Welcome Carol', senderName: 'Bob' },
      unreadCount: 1,
    });
    expect(await historyOf(carol, chatId)).toMatchObject([
      { content: 'Welcome Carol' },
    ]);
  });
});

describe('over the socket', () => {
  it('sends a message to everyone with the name of the sender', async () => {
    const [ada, bob, carol] = await Promise.all([
      registerUser(app, 'Ada'),
      registerUser(app, 'Bob'),
      registerUser(app, 'Carol'),
    ]);
    const chatId = await createGroup(ada, [bob, carol]);
    const socket = await connected(carol, chatId);

    try {
      const arriving = nextEvent<{ content: string; senderName: string }>(
        socket,
        'newMessage',
      );
      await sendMessage(app, bob, chatId, 'Hello');

      await expect(arriving).resolves.toMatchObject({
        content: 'Hello',
        senderName: 'Bob',
      });
    } finally {
      socket.close();
    }
  });

  it('stops delivering to someone as soon as they are removed', async () => {
    const { chatId, owner, member } = await setUpGroup();
    const socket = await connected(member, chatId);
    const received: string[] = [];
    socket.on('newMessage', ({ content }: { content: string }) => {
      received.push(content);
    });

    try {
      const firstArrived = nextEvent(socket, 'newMessage');
      await sendMessage(app, owner, chatId, 'Before');
      await firstArrived;

      await removeMember(owner, chatId, member).expect(204);
      await sendMessage(app, owner, chatId, 'After');
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(received).toEqual(['Before']);
    } finally {
      socket.close();
    }
  });

  it('tells someone who was removed, so their open chat can close', async () => {
    const { chatId, owner, member } = await setUpGroup();
    const socket = await connected(member, chatId);

    try {
      const groupChanged = nextEvent(socket, 'groupChanged');
      await removeMember(owner, chatId, member).expect(204);

      await expect(groupChanged).resolves.toEqual({ chatId });
    } finally {
      socket.close();
    }
  });

  it('refuses a message from someone who was removed', async () => {
    const { chatId, owner, member } = await setUpGroup();
    await removeMember(owner, chatId, member).expect(204);

    const response = await sendMessage(app, member, chatId, 'Still here?');

    expect(response.ok).toBe(false);
  });

  it('lets a member who is alone in a group keep writing', async () => {
    const [ada, bob] = await Promise.all([
      registerUser(app, 'Ada'),
      registerUser(app, 'Bob'),
    ]);
    const chatId = await createGroup(ada, [bob]);
    await removeMember(bob, chatId, bob).expect(204);

    const response = await sendMessage(app, ada, chatId, 'Anyone?');

    expect(response.ok).toBe(true);
  });

  it('tells everyone when the group changes', async () => {
    const { chatId, owner, member } = await setUpGroup();
    const socket = await connected(member, chatId);

    try {
      const listChanged = nextEvent(socket, 'chatsChanged');
      const groupChanged = nextEvent(socket, 'groupChanged');
      await rename(owner, chatId).expect(204);

      await expect(listChanged).resolves.toBeUndefined();
      await expect(groupChanged).resolves.toEqual({ chatId });
    } finally {
      socket.close();
    }
  });
});
