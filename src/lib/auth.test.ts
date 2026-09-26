import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { listBoards } from "@/features/feedback/service";
import { createAuth, type Auth } from "@/lib/auth";
import { createTestDb } from "@/test/db";

async function signUp(auth: Auth, email: string, name: string) {
  const { headers } = await auth.api.signUpEmail({
    body: { email, name, password: "correct-horse-battery" },
    returnHeaders: true,
  });
  const cookie = headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("sign-up did not set a session cookie");
  return new Headers({ cookie });
}

describe("auth & organizations", () => {
  let auth: Auth;
  let db: Db;

  beforeEach(async () => {
    db = await createTestDb();
    auth = createAuth(db, { inNextRuntime: false });
  });

  it("signs a user up and returns their session", async () => {
    const headers = await signUp(auth, "ana@example.com", "Ana");
    const session = await auth.api.getSession({ headers });
    expect(session?.user.email).toBe("ana@example.com");
  });

  it("makes the creator the owner of a new organization", async () => {
    const headers = await signUp(auth, "ana@example.com", "Ana");
    const org = await auth.api.createOrganization({
      headers,
      body: { name: "Acme", slug: "acme" },
    });
    expect(org?.members[0]?.role).toBe("owner");
  });

  it("gives every new organization a default board", async () => {
    const headers = await signUp(auth, "ana@example.com", "Ana");
    const org = await auth.api.createOrganization({ headers, body: { name: "Acme", slug: "acme" } });
    const boards = await listBoards(db, org!.id);
    expect(boards.map((b) => b.slug)).toEqual(["feature-requests"]);
  });

  it("won't let a Free workspace grow past its seat limit, even bypassing the invite form", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const owner = await signUp(auth, "owner@example.com", "Owner");
    const org = await auth.api.createOrganization({ headers: owner, body: { name: "Acme", slug: "acme" } });

    const join = async (email: string) => {
      const invitation = await auth.api.createInvitation({ headers: owner, body: { email, role: "member", organizationId: org!.id } });
      const headers = await signUp(auth, email, email);
      return auth.api.acceptInvitation({ headers, body: { invitationId: invitation.id } });
    };
    await join("two@example.com");
    await join("three@example.com");
    await expect(join("four@example.com")).rejects.toThrow();
  });

  it("lets an invited user join with the invited role", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const owner = await signUp(auth, "ana@example.com", "Ana");
    const org = await auth.api.createOrganization({ headers: owner, body: { name: "Acme", slug: "acme" } });
    const invitation = await auth.api.createInvitation({
      headers: owner,
      body: { email: "bob@example.com", role: "member", organizationId: org!.id },
    });
    expect(info).toHaveBeenCalledWith(expect.stringContaining(`/invite/${invitation.id}`));

    const bob = await signUp(auth, "bob@example.com", "Bob");
    await auth.api.acceptInvitation({ headers: bob, body: { invitationId: invitation.id } });

    const full = await auth.api.getFullOrganization({ headers: owner, query: { organizationId: org!.id } });
    const roles = Object.fromEntries(full!.members.map((m) => [m.user.email, m.role]));
    expect(roles).toEqual({ "ana@example.com": "owner", "bob@example.com": "member" });
  });
});
