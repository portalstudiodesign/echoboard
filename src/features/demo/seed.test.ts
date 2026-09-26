import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { user } from "@/db/schema";
import { findOrganizationBySlug, getPost, listPosts, listRoadmap } from "@/features/feedback/service";
import { createTestDb } from "@/test/db";
import { createUser } from "@/test/fixtures";
import { demoSlug, seedDemo } from "./seed";

describe("demo seed", () => {
  it("builds a lively public board with a roadmap and a merged duplicate", async () => {
    const db = await createTestDb();
    const { boardId, organizationId } = await seedDemo(db);

    const { posts } = await listPosts(db, { boardId });
    expect(posts[0]).toMatchObject({ title: "Dark mode", voteCount: 58 });
    expect(posts.some((p) => p.title === "Night theme please")).toBe(false); // merged away

    const roadmap = await listRoadmap(db, organizationId);
    expect(roadmap.in_progress.map((p) => p.title)).toEqual(["Two-way Google Calendar sync", "Recurring events with custom rules"]);
  });

  it("can be re-run: it resets the demo without touching anyone else", async () => {
    const db = await createTestDb();
    const bystander = await createUser(db, "Real Customer");
    await seedDemo(db);
    const second = await seedDemo(db);

    expect((await findOrganizationBySlug(db, demoSlug))?.id).toBe(second.organizationId);
    expect(await db.select().from(user).where(eq(user.id, bystander.id))).toHaveLength(1);
    const { posts } = await listPosts(db, { boardId: second.boardId });
    expect(await getPost(db, posts[0].id)).toMatchObject({ voteCount: 58, commentCount: 2 });
  });
});
