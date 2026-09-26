import { randomUUID } from "node:crypto";
import type { Db } from "@/db/client";
import { member, organization, user } from "@/db/schema";

export async function createUser(db: Db, name = "Test User") {
  const id = randomUUID();
  await db.insert(user).values({ id, name, email: `${id}@example.test` });
  return { id, name };
}

export async function createOrganization(db: Db, ownerId: string, slug = "acme") {
  const id = randomUUID();
  await db.insert(organization).values({ id, name: "Acme", slug, createdAt: new Date() });
  await db.insert(member).values({ id: randomUUID(), organizationId: id, userId: ownerId, role: "owner", createdAt: new Date() });
  return { id, slug };
}
