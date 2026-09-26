import { relations, sql } from "drizzle-orm";
import { check, index, integer, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
// Relative (not "@/…") so drizzle-kit can resolve it outside the Next.js/Vitest toolchain.
import { postStatuses } from "../../features/feedback/statuses";
import { organization, user } from "./auth";

export { postStatuses, type PostStatus } from "../../features/feedback/statuses";
export const postStatus = pgEnum("post_status", postStatuses);

export const board = pgTable(
  "board",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text().notNull(),
    slug: text().notNull(),
    description: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("board_org_slug_uidx").on(table.organizationId, table.slug)],
);

export const post = pgTable(
  "post",
  {
    id: uuid().primaryKey().defaultRandom(),
    boardId: uuid()
      .notNull()
      .references(() => board.id, { onDelete: "cascade" }),
    // Posts outlive their authors: deleting an account keeps the feedback, anonymised.
    authorId: text().references(() => user.id, { onDelete: "set null" }),
    title: text().notNull(),
    body: text().notNull().default(""),
    status: postStatus().notNull().default("open"),
    // Denormalised so boards can sort by votes without aggregating on every read.
    voteCount: integer().notNull().default(0),
    commentCount: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("post_board_votes_idx").on(table.boardId, table.voteCount),
    index("post_board_created_idx").on(table.boardId, table.createdAt),
    check("post_vote_count_non_negative", sql`${table.voteCount} >= 0`),
  ],
);

export const vote = pgTable(
  "vote",
  {
    postId: uuid()
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  // One vote per user per post, enforced by the database.
  (table) => [primaryKey({ columns: [table.postId, table.userId] }), index("vote_user_idx").on(table.userId)],
);

export const comment = pgTable(
  "comment",
  {
    id: uuid().primaryKey().defaultRandom(),
    postId: uuid()
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    authorId: text().references(() => user.id, { onDelete: "set null" }),
    body: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("comment_post_idx").on(table.postId, table.createdAt)],
);

export const boardRelations = relations(board, ({ one, many }) => ({
  organization: one(organization, { fields: [board.organizationId], references: [organization.id] }),
  posts: many(post),
}));

export const postRelations = relations(post, ({ one, many }) => ({
  board: one(board, { fields: [post.boardId], references: [board.id] }),
  author: one(user, { fields: [post.authorId], references: [user.id] }),
  votes: many(vote),
  comments: many(comment),
}));

export const voteRelations = relations(vote, ({ one }) => ({
  post: one(post, { fields: [vote.postId], references: [post.id] }),
  user: one(user, { fields: [vote.userId], references: [user.id] }),
}));

export const commentRelations = relations(comment, ({ one }) => ({
  post: one(post, { fields: [comment.postId], references: [post.id] }),
  author: one(user, { fields: [comment.authorId], references: [user.id] }),
}));
