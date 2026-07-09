import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ============================
   USERS
============================ */

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk ID
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),

  createdAt: timestamp("created_at", {
    mode: "date",
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", {
    mode: "date",
  })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* ============================
   CONVERSATIONS
============================ */

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),

  // false = private chat
  // true = group chat
  isGroup: boolean("is_group").notNull().default(false),

  name: text("name"), // only used for group chats

  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  createdAt: timestamp("created_at", {
    mode: "date",
  })
    .notNull()
    .defaultNow(),
});

/* ============================
   CONVERSATION MEMBERS
============================ */

export const conversationMembers = pgTable(
  "conversation_members",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, {
        onDelete: "cascade",
      }),

    userId: text("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    joinedAt: timestamp("joined_at", {
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.conversationId, table.userId],
    }),
  }),
);

/* ============================
   MESSAGES
============================ */

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),

  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, {
      onDelete: "cascade",
    }),

  senderId: text("sender_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  content: text("content").notNull(),

  createdAt: timestamp("created_at", {
    mode: "date",
  })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", {
    mode: "date",
  })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* =====================================================
   RELATIONS
===================================================== */

// USERS

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(conversationMembers),
  messages: many(messages),
  createdConversations: many(conversations),
}));

// CONVERSATIONS

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    creator: one(users, {
      fields: [conversations.createdBy],
      references: [users.id],
    }),

    members: many(conversationMembers),

    messages: many(messages),
  }),
);

// CONVERSATION MEMBERS

export const conversationMembersRelations = relations(
  conversationMembers,
  ({ one }) => ({
    user: one(users, {
      fields: [conversationMembers.userId],
      references: [users.id],
    }),

    conversation: one(conversations, {
      fields: [conversationMembers.conversationId],
      references: [conversations.id],
    }),
  }),
);

// MESSAGES

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),

  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

/* =====================================================
   TYPES
===================================================== */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type ConversationMember = typeof conversationMembers.$inferSelect;
export type NewConversationMember = typeof conversationMembers.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
