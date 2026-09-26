import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, ButtonLink, Card, Logo } from "@/components/ui";
import { db } from "@/db/client";
import { member, organization } from "@/db/schema";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Your workspaces" };

export default async function DashboardPage() {
  const session = await requireSession("/dashboard");
  const workspaces = await db
    .select({ name: organization.name, slug: organization.slug, role: member.role })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, session.user.id))
    .orderBy(organization.name);

  if (workspaces.length === 0) redirect("/onboarding");
  if (workspaces.length === 1) redirect(`/o/${workspaces[0].slug}`);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-16">
      <Logo className="mb-8 self-center text-lg" />
      <h1 className="text-xl font-semibold">Your workspaces</h1>
      <Card className="mt-4 divide-y divide-border">
        {workspaces.map((workspace) => (
          <Link key={workspace.slug} href={`/o/${workspace.slug}`} className="flex items-center justify-between px-4 py-3 hover:bg-surface-2">
            <span className="font-medium">{workspace.name}</span>
            <Badge>{workspace.role}</Badge>
          </Link>
        ))}
      </Card>
      <ButtonLink href="/onboarding" variant="secondary" className="mt-4 self-start">
        New workspace
      </ButtonLink>
    </main>
  );
}
