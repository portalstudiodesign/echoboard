import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db/client";
import { member, organization } from "@/db/schema";
import { auth } from "@/lib/auth";
import { asRole } from "@/lib/roles";

/** The current session, read at most once per request. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export async function requireSession(returnTo?: string) {
  const session = await getSession();
  if (!session) redirect(returnTo ? `/sign-in?next=${encodeURIComponent(returnTo)}` : "/sign-in");
  return session;
}

/** The signed-in user's membership in the organization with this slug; 404 for non-members. */
export const requireMembership = cache(async (slug: string) => {
  const session = await requireSession(`/o/${slug}`);
  const [row] = await db
    .select({ organization, role: member.role })
    .from(organization)
    .innerJoin(member, and(eq(member.organizationId, organization.id), eq(member.userId, session.user.id)))
    .where(eq(organization.slug, slug))
    .limit(1);
  if (!row) notFound();
  return { session, organization: row.organization, role: asRole(row.role) };
});
