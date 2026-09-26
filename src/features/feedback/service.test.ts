import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { user } from "@/db/schema";
import {
  addComment,
  createBoard,
  createPost,
  deletePost,
  getPost,
  isStaff,
  listComments,
  listPosts,
  setPostStatus,
  toggleVote,
} from "@/features/feedback/service";
import { createTestDb } from "@/test/db";
import { createOrganization, createUser } from "@/test/fixtures";

describe("feedback service", () => {
  let db: Db;
  let boardId: string;
  let orgId: string;
  let ana: { id: string };
  let bob: { id: string };

  beforeEach(async () => {
    db = await createTestDb();
    ana = await createUser(db, "Ana");
    bob = await createUser(db, "Bob");
    orgId = (await createOrganization(db, ana.id)).id;
    const board = await createBoard(db, { organizationId: orgId, name: "Ideas", slug: "ideas" });
    boardId = board!.id;
  });

  it("rejects a second board with the same slug in one organization", async () => {
    expect(await createBoard(db, { organizationId: orgId, name: "Again", slug: "ideas" })).toBeUndefined();
  });

  it("counts the author's own vote on a new post", async () => {
    const { id } = await createPost(db, { boardId, authorId: bob.id, title: "Dark mode", body: "" });
    expect(await getPost(db, id, bob.id)).toMatchObject({ voteCount: 1, hasVoted: true, authorName: "Bob" });
    expect((await getPost(db, id, ana.id))?.hasVoted).toBe(false);
  });

  it("toggles a vote on and off, keeping the count in sync", async () => {
    const { id } = await createPost(db, { boardId, authorId: bob.id, title: "Dark mode", body: "" });
    expect(await toggleVote(db, { postId: id, userId: ana.id })).toEqual({ voted: true, voteCount: 2 });
    expect(await toggleVote(db, { postId: id, userId: ana.id })).toEqual({ voted: false, voteCount: 1 });
  });

  it("keeps vote counts correct when a voter's account is deleted", async () => {
    const { id } = await createPost(db, { boardId, authorId: ana.id, title: "Dark mode", body: "" });
    await toggleVote(db, { postId: id, userId: bob.id });
    await db.delete(user).where(eq(user.id, bob.id));
    expect((await getPost(db, id))?.voteCount).toBe(1);
  });

  it("sorts by votes by default and by date on request", async () => {
    const older = await createPost(db, { boardId, authorId: ana.id, title: "Older, popular", body: "" });
    await toggleVote(db, { postId: older.id, userId: bob.id });
    await createPost(db, { boardId, authorId: ana.id, title: "Newer", body: "" });

    expect((await listPosts(db, { boardId })).posts.map((p) => p.title)).toEqual(["Older, popular", "Newer"]);
    expect((await listPosts(db, { boardId, sort: "new" })).posts.map((p) => p.title)).toEqual(["Newer", "Older, popular"]);
  });

  it("hides closed posts unless asked for them, and filters by status and title", async () => {
    const closed = await createPost(db, { boardId, authorId: ana.id, title: "Will not do", body: "" });
    await setPostStatus(db, closed.id, "closed");
    const planned = await createPost(db, { boardId, authorId: ana.id, title: "Export to CSV", body: "" });
    await setPostStatus(db, planned.id, "planned");

    expect((await listPosts(db, { boardId })).posts.map((p) => p.title)).toEqual(["Export to CSV"]);
    expect((await listPosts(db, { boardId, status: "closed" })).posts.map((p) => p.title)).toEqual(["Will not do"]);
    expect((await listPosts(db, { boardId, search: "csv" })).posts).toHaveLength(1);
    // LIKE wildcards in the search box are matched literally.
    expect((await listPosts(db, { boardId, search: "100%" })).posts).toHaveLength(0);
  });

  it("paginates", async () => {
    for (let i = 0; i < 31; i++) await createPost(db, { boardId, authorId: ana.id, title: `Post ${i}`, body: "" });
    const first = await listPosts(db, { boardId });
    const second = await listPosts(db, { boardId, page: 2 });
    expect([first.posts.length, first.hasMore, second.posts.length, second.hasMore]).toEqual([30, true, 1, false]);
  });

  it("lists comments in order and counts them", async () => {
    const { id } = await createPost(db, { boardId, authorId: bob.id, title: "Dark mode", body: "" });
    await addComment(db, { postId: id, authorId: ana.id, body: "On our list!" });
    await addComment(db, { postId: id, authorId: bob.id, body: "Thanks" });
    expect((await listComments(db, id)).map((c) => [c.authorName, c.body])).toEqual([
      ["Ana", "On our list!"],
      ["Bob", "Thanks"],
    ]);
    expect((await getPost(db, id))?.commentCount).toBe(2);
  });

  it("deletes a post together with its votes and comments", async () => {
    const { id } = await createPost(db, { boardId, authorId: bob.id, title: "Spam", body: "" });
    await addComment(db, { postId: id, authorId: ana.id, body: "?" });
    await deletePost(db, id);
    expect(await getPost(db, id)).toBeUndefined();
  });

  it("recognises organization members as staff", async () => {
    expect(await isStaff(db, orgId, ana.id)).toBe(true);
    expect(await isStaff(db, orgId, bob.id)).toBe(false);
    expect(await isStaff(db, orgId, undefined)).toBe(false);
  });
});
