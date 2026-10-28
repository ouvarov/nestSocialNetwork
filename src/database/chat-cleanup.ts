import {
  and,
  eq,
  exists,
  gt,
  inArray,
  isNull,
  notExists,
  or,
} from 'drizzle-orm';

import type { Transaction } from '@/database/drizzle';
import { ChatMembers } from '@/database/schemas/chatMembers.schema';
import { Chats } from '@/database/schemas/chats.schema';
import { Messages } from '@/database/schemas/messages.schema';

const lockChats = async (tx: Transaction, chatIds: string[]) => {
  if (chatIds.length === 0) return;

  await tx
    .select({ chatId: Chats.chat_id })
    .from(Chats)
    .where(inArray(Chats.chat_id, chatIds))
    .orderBy(Chats.chat_id)
    .for('update');
};

const deleteChatsNobodySees = async (tx: Transaction, chatIds: string[]) => {
  if (chatIds.length === 0) return;

  const messagesAfterClear = tx
    .select({ messageId: Messages.message_id })
    .from(Messages)
    .where(
      and(
        eq(Messages.chat_id, ChatMembers.chat_id),
        gt(Messages.sent_at, ChatMembers.cleared_at),
      ),
    );
  const membersSeeingHistory = tx
    .select({ userId: ChatMembers.user_id })
    .from(ChatMembers)
    .where(
      and(
        eq(ChatMembers.chat_id, Chats.chat_id),
        or(isNull(ChatMembers.cleared_at), exists(messagesAfterClear)),
      ),
    );

  await tx
    .delete(Chats)
    .where(
      and(inArray(Chats.chat_id, chatIds), notExists(membersSeeingHistory)),
    );
};

export { deleteChatsNobodySees, lockChats };
