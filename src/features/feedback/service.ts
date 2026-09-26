import { and, asc, count, desc, eq, ilike, inArray, ne, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db/client";
import { board, comment, member, organization, post, user, vote, type PostStatus } from "@/db/schema";

/**
 * Feedback domain: boards, posts, votes, comments.
 * Every function takes the database handle, so the same code runs against Postgres in
 * production and an in-memory PGlite in tests. Authorization lives in the callers
 * (server actions), which decide *who* may call these; this module decides *what* happens.
 */

export type PostSort = "top" | "new";
export const pageSize = 30;

export async function findOrganizationBySlug(db: Db, slug: string) {
  const [row] = await db
    .select({ id: organization.id, name: organization.name, slug: organization.slug, logo: organization.logo })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);
  return row;
}

export async function isStaff(db: Db, organizationId: string, userId: string | undefined) {
  if (!userId) return false;
  const [row] = await db
    .select({ id: member.id })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
    .limit(1);
  return !!row;
}

export function listBoards(db: Db, organizationId: string) {
  return db
    .select({
      id: board.id,
      name: board.name,
      slug: board.slug,
      description: board.description,
      postCount: sql<number>`(select count(*)::int from ${post} where ${post.boardId} = ${board.id})`,
    })
    .from(board)
    .where(eq(board.organizationId, organizationId))
    .orderBy(asc(board.createdAt));
}

export async function createBoard(
  db: Db,
  input: { organizationId: string; name: string; slug: string; description?: string | null },
) {
  const [created] = await db
    .insert(board)
    .values(input)
    .onConflictDoNothing({ target: [board.organizationId, board.slug] })
    .returning();
  return created; // undefined when the slug is already used in this organization
}

export async function countBoards(db: Db, organizationId: string) {
  const [row] = await db.select({ value: count() }).from(board).where(eq(board.organizationId, organizationId));
  return row?.value ?? 0;
}

export async function listPosts(
  db: Db,
  options: {
    boardId: string;
    viewerId?: string;
    sort?: PostSort;
    status?: PostStatus | "active";
    search?: string;
    page?: number;
  },
) {
  const filters: SQL[] = [eq(post.boardId, options.boardId)];
  const status = options.status ?? "active";
  if (status === "active") filters.push(ne(post.status, "closed"));
  else filters.push(eq(post.status, status));
  const search = options.search?.trim();
  if (search) filters.push(ilike(post.title, `%${search.replace(/[\%_]/g, "\$&")}%`));

  const page = Math.max(1, options.page ?? 1);
  const rows = await db
    .select({
      id: post.id,
      title: post.title,
      body: post.body,
      status: post.status,
      voteCount: post.voteCount,
      commentCount: post.commentCount,
      createdAt: post.createdAt,
      hasVoted: options.viewerId
        ? sql<boolean>`exists(select 1 from ${vote} where ${vote.postId} = ${post.id} and ${vote.userId} = ${options.viewerId})`
        : sql<boolean>`false`,
    })
    .from(post)
    .where(and(...filters))
    .orderBy(...(options.sort === "new" ? [desc(post.createdAt)] : [desc(post.voteCount), desc(post.createdAt)]))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  return { posts: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

export async function getPost(db: Db, postId: string, viewerId?: string) {
  const [row] = await db
    .select({
      id: post.id,
      title: post.title,
      body: post.body,
      status: post.status,
      voteCount: post.voteCount,
      commentCount: post.commentCount,
      createdAt: post.createdAt,
      authorName: user.name,
      board: { id: board.id, name: board.name, slug: board.slug, organizationId: board.organizationId },
      hasVoted: viewerId
        ? sql<boolean>`exists(select 1 from ${vote} where ${vote.postId} = ${post.id} and ${vote.userId} = ${viewerId})`
        : sql<boolean>`false`,
    })
    .from(post)
    .innerJoin(board, eq(post.boardId, board.id))
    .leftJoin(user, eq(post.authorId, user.id))
    .where(eq(post.id, postId))
    .limit(1);
  return row;
}

export async function createPost(db: Db, input: { boardId: string; authorId: string; title: string; body: string }) {
  return db.transaction(async (tx) => {
    const [created] = await tx.insert(post).values(input).returning({ id: post.id });
    // Authors support their own idea by default, as on every feedback tool people are used to.
    await tx.insert(vote).values({ postId: created.id, userId: input.authorId });
    return created;
  });
}

/** Adds the user's vote, or removes it if they had already voted. Returns the new state. */
export async function toggleVote(db: Db, input: { postId: string; userId: string }) {
  return db.transaction(async (tx) => {
    const removed = await tx
      .delete(vote)
      .where(and(eq(vote.postId, input.postId), eq(vote.userId, input.userId)))
      .returning({ postId: vote.postId });
    if (removed.length === 0) {
      await tx.insert(vote).values(input).onConflictDoNothing();
    }
    const [row] = await tx.select({ voteCount: post.voteCount }).from(post).where(eq(post.id, input.postId));
    return { voted: removed.length === 0, voteCount: row?.voteCount ?? 0 };
  });
}

export function listComments(db: Db, postId: string) {
  return db
    .select({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      authorId: comment.authorId,
      authorName: user.name,
    })
    .from(comment)
    .leftJoin(user, eq(comment.authorId, user.id))
    .where(eq(comment.postId, postId))
    .orderBy(asc(comment.createdAt));
}

export async function addComment(db: Db, input: { postId: string; authorId: string; body: string }) {
  const [created] = await db.insert(comment).values(input).returning({ id: comment.id });
  return created;
}

export async function setPostStatus(db: Db, postId: string, status: PostStatus) {
  await db.update(post).set({ status }).where(eq(post.id, postId));
}

export async function deletePost(db: Db, postId: string) {
  await db.delete(post).where(eq(post.id, postId));
}

/** Which of these users are staff (members) of the organization — used to badge team replies. */
export async function staffUserIds(db: Db, organizationId: string, userIds: string[]) {
  if (userIds.length === 0) return new Set<string>();
  const rows = await db
    .select({ userId: member.userId })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), inArray(member.userId, userIds)));
  return new Set(rows.map((row) => row.userId));
}
