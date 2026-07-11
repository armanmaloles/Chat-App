import { db } from "./index";
import { eq, and, desc } from "drizzle-orm";

import {
  users,
  conversations,
  conversationMembers,
  messages,
  type NewUser,
  type NewConversation,
  type NewConversationMember,
  type NewMessage,
} from "./schema";

// USER QUERIES

export const createUser = async (data: NewUser) => {
  const [user] = await db.insert(users).values(data).returning();
  return user;
};

export const getUserById = async (id: string) => {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
};

export const getAllUsers = async () => {
  return db.query.users.findMany();
};

export const updateUser = async (
  id: string,
  data: Partial<NewUser>
) => {
  const [user] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();

  return user;
};

export const deleteUser = async (id: string) => {
  const [user] = await db
    .update(users)
    .set({
      email: `${id}@deleted.local`,
      name: "Deleted User",
      imageUrl: null,
      isDeleted: true,
    })
    .where(eq(users.id, id))
    .returning();

  return user;
};

export const upsertUser = async (data: NewUser) => {
  const [user] = await db
    .insert(users)
    .values(data)
    .onConflictDoUpdate({
      target: users.id,
      set: data,
    })
    .returning();

  return user;
};

// CONVERSATION QUERIES

export const createConversation = async (
  data: NewConversation
) => {
  const [conversation] = await db
    .insert(conversations)
    .values(data)
    .returning();

  return conversation;
};

export const getConversationById = async (
  conversationId: string
) => {
  return db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),

    with: {
      creator: true,

      members: {
        with: {
          user: true,
        },
      },

      messages: {
        with: {
          sender: true,
        },
      },
    },
  });
};

export const getUserConversations = async (
  userId: string
) => {
  return db.query.conversationMembers.findMany({
    where: eq(conversationMembers.userId, userId),

    with: {
      conversation: {
        with: {
          creator: true,
          members: {
            with: {
              user: true,
            },
          },
          messages: {
            with: {
              sender: true,
            },
            orderBy: (messages, { desc }) => [desc(messages.createdAt)],
            limit: 1,
          },
        },
      },
    },
  });
};

// CONVERSATION MEMBER QUERIES

export const addMemberToConversation = async (
  data: NewConversationMember
) => {
  const [member] = await db
    .insert(conversationMembers)
    .values(data)
    .returning();

  return member;
};

export const removeMemberFromConversation = async (
  conversationId: string,
  userId: string
) => {
  const [member] = await db
    .delete(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId)
      )
    )
    .returning();

  return member;
};

export const getConversationMembers = async (
  conversationId: string
) => {
  return db.query.conversationMembers.findMany({
    where: eq(
      conversationMembers.conversationId,
      conversationId
    ),

    with: {
      user: true,
    },
  });
};

// MESSAGE QUERIES

export const sendMessage = async (
  data: NewMessage
) => {
  const [message] = await db
    .insert(messages)
    .values(data)
    .returning();

  return message;
};

export const getMessageById = async (
  id: string
) => {
  return db.query.messages.findFirst({
    where: eq(messages.id, id),

    with: {
      sender: true,
      conversation: true,
    },
  });
};

export const getConversationMessages = async (
  conversationId: string
) => {
  return db.query.messages.findMany({
    where: eq(
      messages.conversationId,
      conversationId
    ),

    with: {
      sender: true,
    },

    orderBy: (messages, { asc }) => [
      asc(messages.createdAt),
    ],
  });
};

export const deleteMessage = async (
  id: string
) => {
  const [message] = await db
    .delete(messages)
    .where(eq(messages.id, id))
    .returning();

  return message;
};