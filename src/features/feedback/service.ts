import { and, asc, count, desc, eq, ilike, inArray, isNull, ne, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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
  const filters: SQL[] = [eq(post.boardId, options.boardId), isNull(post.mergedIntoId)];
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

const mergeTarget = alias(post, "merge_target");

export async function getPost(db: Db, postId: string, viewerId?: string) {
  const [row] = await db
    .select({
      mergedInto: { id: mergeTarget.id, title: mergeTarget.title },
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
    .leftJoin(mergeTarget, eq(post.mergedIntoId, mergeTarget.id))
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

/** Returns true only when the status actually changed, so callers notify voters once. */
export async function setPostStatus(db: Db, postId: string, status: PostStatus) {
  const changed = await db
    .update(post)
    .set({ status })
    .where(and(eq(post.id, postId), ne(post.status, status)))
    .returning({ id: post.id });
  return changed.length > 0;
}

export const roadmapStatuses = ["planned", "in_progress", "complete"] as const satisfies readonly PostStatus[];

/** Posts the team has committed to, across every board of the organization, most wanted first. */
export async function listRoadmap(db: Db, organizationId: string, perColumn = 50) {
  const rows = await db
    .select({
      id: post.id,
      title: post.title,
      status: post.status,
      voteCount: post.voteCount,
      boardName: board.name,
      // Rank within each column so one busy column can't crowd out the others.
      rank: sql<number>`row_number() over (partition by ${post.status} order by ${post.voteCount} desc, ${post.createdAt} desc)`,
    })
    .from(post)
    .innerJoin(board, eq(post.boardId, board.id))
    .where(and(eq(board.organizationId, organizationId), inArray(post.status, roadmapStatuses), isNull(post.mergedIntoId)))
    .orderBy(desc(post.voteCount), desc(post.createdAt));

  const columns = Object.fromEntries(roadmapStatuses.map((status) => [status, [] as typeof rows])) as Record<
    (typeof roadmapStatuses)[number],
    typeof rows
  >;
  for (const row of rows) {
    if (Number(row.rank) <= perColumn) columns[row.status as (typeof roadmapStatuses)[number]].push(row);
  }
  return columns;
}

/** Email addresses of everyone who voted for a post, except the person making the change. */
export async function listVoterEmails(db: Db, postId: string, exceptUserId?: string) {
  const rows = await db
    .select({ email: user.email, name: user.name })
    .from(vote)
    .innerJoin(user, eq(vote.userId, user.id))
    .where(and(eq(vote.postId, postId), exceptUserId ? ne(vote.userId, exceptUserId) : undefined));
  return rows;
}

/** Other live posts in the same organization whose titles match — candidates to merge into. */
export function searchMergeTargets(db: Db, input: { organizationId: string; excludePostId: string; search: string }) {
  const search = input.search.trim().replace(/[\\%_]/g, "\\$&");
  return db
    .select({ id: post.id, title: post.title, voteCount: post.voteCount, boardName: board.name })
    .from(post)
    .innerJoin(board, eq(post.boardId, board.id))
    .where(
      and(
        eq(board.organizationId, input.organizationId),
        ne(post.id, input.excludePostId),
        isNull(post.mergedIntoId),
        search ? ilike(post.title, `%${search}%`) : undefined,
      ),
    )
    .orderBy(desc(post.voteCount))
    .limit(8);
}

export class MergeError extends Error {}

/**
 * Folds a duplicate into the post that stays. Votes move over without double-counting people
 * who voted for both; the duplicate is closed and points at its replacement, and anything
 * previously merged into the duplicate now points at the survivor too.
 * Returns the voters of the duplicate who did not already support the survivor.
 */
export async function mergePost(db: Db, input: { duplicateId: string; targetId: string }) {
  if (input.duplicateId === input.targetId) throw new MergeError("A post can't be merged into itself.");

  return db.transaction(async (tx) => {
    const posts = await tx
      .select({ id: post.id, mergedIntoId: post.mergedIntoId, organizationId: board.organizationId })
      .from(post)
      .innerJoin(board, eq(post.boardId, board.id))
      .where(inArray(post.id, [input.duplicateId, input.targetId]))
      .for("update", { of: post });
    const duplicate = posts.find((p) => p.id === input.duplicateId);
    const target = posts.find((p) => p.id === input.targetId);
    if (!duplicate || !target) throw new MergeError("One of these posts no longer exists.");
    if (duplicate.organizationId !== target.organizationId) throw new MergeError("Posts can only be merged within one workspace.");
    if (duplicate.mergedIntoId) throw new MergeError("This post was already merged.");
    if (target.mergedIntoId) throw new MergeError("Pick a post that hasn't been merged itself.");

    const newSupporters = await tx
      .select({ userId: vote.userId, email: user.email, name: user.name })
      .from(vote)
      .innerJoin(user, eq(vote.userId, user.id))
      .where(
        and(
          eq(vote.postId, input.duplicateId),
          sql`not exists (select 1 from ${vote} v2 where v2.post_id = ${input.targetId} and v2.user_id = ${vote.userId})`,
        ),
      );

    if (newSupporters.length > 0) {
      await tx
        .insert(vote)
        .values(newSupporters.map((s) => ({ postId: input.targetId, userId: s.userId })))
        .onConflictDoNothing();
    }
    await tx.delete(vote).where(eq(vote.postId, input.duplicateId));
    await tx.update(post).set({ mergedIntoId: input.targetId }).where(eq(post.mergedIntoId, input.duplicateId));
    await tx.update(post).set({ mergedIntoId: input.targetId, status: "closed" }).where(eq(post.id, input.duplicateId));

    return newSupporters.map(({ email, name }) => ({ email, name }));
  });
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
