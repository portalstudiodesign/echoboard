import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { user, type PostStatus } from "@/db/schema";
import {
  addComment,
  createBoard,
  createPost,
  deletePost,
  getPost,
  isStaff,
  listComments,
  listPosts,
  listRoadmap,
  listVoterEmails,
  MergeError,
  mergePost,
  searchMergeTargets,
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

  it("reports whether a status change actually changed anything", async () => {
    const { id } = await createPost(db, { boardId, authorId: bob.id, title: "Dark mode", body: "" });
    expect(await setPostStatus(db, id, "planned")).toBe(true);
    expect(await setPostStatus(db, id, "planned")).toBe(false);
  });

  it("lists voters to notify, leaving out the person making the change", async () => {
    const { id } = await createPost(db, { boardId, authorId: bob.id, title: "Dark mode", body: "" });
    await toggleVote(db, { postId: id, userId: ana.id });
    expect((await listVoterEmails(db, id, ana.id)).map((v) => v.name)).toEqual(["Bob"]);
  });

  it("builds a roadmap of committed work, most wanted first, without open or merged posts", async () => {
    const make = async (title: string, status: PostStatus) => {
      const { id } = await createPost(db, { boardId, authorId: ana.id, title, body: "" });
      await setPostStatus(db, id, status);
      return id;
    };
    const popular = await make("Popular plan", "planned");
    await toggleVote(db, { postId: popular, userId: bob.id });
    await make("Quiet plan", "planned");
    await make("Building it", "in_progress");
    await make("Shipped", "complete");
    await make("Just an idea", "open");

    const roadmap = await listRoadmap(db, orgId);
    expect({
      planned: roadmap.planned.map((p) => p.title),
      in_progress: roadmap.in_progress.map((p) => p.title),
      complete: roadmap.complete.map((p) => p.title),
    }).toEqual({ planned: ["Popular plan", "Quiet plan"], in_progress: ["Building it"], complete: ["Shipped"] });
  });

  it("caps each roadmap column independently", async () => {
    for (let i = 0; i < 3; i++) {
      const { id } = await createPost(db, { boardId, authorId: ana.id, title: `Plan ${i}`, body: "" });
      await setPostStatus(db, id, "planned");
    }
    const { id } = await createPost(db, { boardId, authorId: ana.id, title: "Shipped", body: "" });
    await setPostStatus(db, id, "complete");
    const roadmap = await listRoadmap(db, orgId, 2);
    expect([roadmap.planned.length, roadmap.complete.length]).toEqual([2, 1]);
  });

  describe("merging duplicates", () => {
    it("moves votes to the surviving post without double-counting shared voters", async () => {
      const carol = await createUser(db, "Carol");
      const target = await createPost(db, { boardId, authorId: ana.id, title: "Dark mode", body: "" }); // Ana
      const duplicate = await createPost(db, { boardId, authorId: bob.id, title: "Night theme", body: "" }); // Bob
      await toggleVote(db, { postId: duplicate.id, userId: ana.id }); // Ana voted for both
      await toggleVote(db, { postId: duplicate.id, userId: carol.id });

      const moved = await mergePost(db, { duplicateId: duplicate.id, targetId: target.id });

      expect(moved.map((v) => v.name).sort()).toEqual(["Bob", "Carol"]);
      expect((await getPost(db, target.id))?.voteCount).toBe(3);
      expect(await getPost(db, duplicate.id)).toMatchObject({
        voteCount: 0,
        status: "closed",
        mergedInto: { id: target.id, title: "Dark mode" },
      });
      expect((await listPosts(db, { boardId, status: "closed" })).posts).toHaveLength(0);
    });

    it("re-points earlier merges so nothing ends up pointing at a merged post", async () => {
      const a = await createPost(db, { boardId, authorId: ana.id, title: "A", body: "" });
      const b = await createPost(db, { boardId, authorId: ana.id, title: "B", body: "" });
      const c = await createPost(db, { boardId, authorId: ana.id, title: "C", body: "" });
      await mergePost(db, { duplicateId: a.id, targetId: b.id });
      await mergePost(db, { duplicateId: b.id, targetId: c.id });
      expect((await getPost(db, a.id))?.mergedInto?.id).toBe(c.id);
    });

    it("refuses merges that would lose or loop data", async () => {
      const a = await createPost(db, { boardId, authorId: ana.id, title: "A", body: "" });
      const b = await createPost(db, { boardId, authorId: ana.id, title: "B", body: "" });
      await expect(mergePost(db, { duplicateId: a.id, targetId: a.id })).rejects.toThrow(MergeError);
      await mergePost(db, { duplicateId: a.id, targetId: b.id });
      await expect(mergePost(db, { duplicateId: a.id, targetId: b.id })).rejects.toThrow("already merged");
      await expect(mergePost(db, { duplicateId: b.id, targetId: a.id })).rejects.toThrow("hasn't been merged");
    });

    it("never merges across workspaces", async () => {
      const otherOrg = await createOrganization(db, bob.id, "other");
      const otherBoard = await createBoard(db, { organizationId: otherOrg.id, name: "Ideas", slug: "ideas" });
      const mine = await createPost(db, { boardId, authorId: ana.id, title: "Mine", body: "" });
      const theirs = await createPost(db, { boardId: otherBoard!.id, authorId: bob.id, title: "Theirs", body: "" });
      await expect(mergePost(db, { duplicateId: theirs.id, targetId: mine.id })).rejects.toThrow("within one workspace");
    });

    it("suggests merge targets from the same workspace only, excluding the post itself", async () => {
      const a = await createPost(db, { boardId, authorId: ana.id, title: "Dark mode", body: "" });
      await createPost(db, { boardId, authorId: ana.id, title: "Dark theme", body: "" });
      const targets = await searchMergeTargets(db, { organizationId: orgId, excludePostId: a.id, search: "dark" });
      expect(targets.map((t) => t.title)).toEqual(["Dark theme"]);
    });
  });

  it("recognises organization members as staff", async () => {
    expect(await isStaff(db, orgId, ana.id)).toBe(true);
    expect(await isStaff(db, orgId, bob.id)).toBe(false);
    expect(await isStaff(db, orgId, undefined)).toBe(false);
  });
});
