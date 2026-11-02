import type { ChatRole } from '@/database/schemas/chatMembers.schema';

const MAX_GROUP_MEMBERS = 50;

const ASSIGNABLE_ROLES = ['moderator', 'member'] as const;

type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

const canManageGroup = (role: ChatRole): boolean => role !== 'member';

const isOwner = (role: ChatRole): boolean => role === 'owner';

const canRemove = (actor: ChatRole, target: ChatRole): boolean =>
  isOwner(actor) || (actor === 'moderator' && target === 'member');

export {
  ASSIGNABLE_ROLES,
  MAX_GROUP_MEMBERS,
  canManageGroup,
  canRemove,
  isOwner,
};
export type { AssignableRole };
