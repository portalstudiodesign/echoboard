import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/(auth)/actions";
import { Button, ButtonLink, Card, Logo } from "@/components/ui";
import { db } from "@/db/client";
import { invitation, organization, user } from "@/db/schema";
import { getSession } from "@/lib/session";
import { InvitationResponse } from "./invitation-response";

export const metadata: Metadata = { title: "Invitation" };

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="mb-8">
        <Logo className="text-lg" />
      </Link>
      <Card className="w-full max-w-sm p-6">{children}</Card>
    </main>
  );
}

export default async function InvitationPage({ params }: PageProps<"/invite/[id]">) {
  const { id } = await params;
  const [row] = await db
    .select({ invitation, organizationName: organization.name, inviterName: user.name })
    .from(invitation)
    .innerJoin(organization, eq(invitation.organizationId, organization.id))
    .innerJoin(user, eq(invitation.inviterId, user.id))
    .where(eq(invitation.id, id))
    .limit(1);

  if (!row || row.invitation.status !== "pending" || row.invitation.expiresAt < new Date()) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">This invitation is no longer valid</h1>
        <p className="mt-2 text-sm text-muted">It may have expired, been revoked, or already been used. Ask a workspace admin for a new one.</p>
        <ButtonLink href="/dashboard" variant="secondary" className="mt-6 w-full">
          Go to Echoboard
        </ButtonLink>
      </Shell>
    );
  }

  const heading = (
    <>
      <p className="text-sm text-muted">{row.inviterName} invited you to join</p>
      <h1 className="mt-1 text-xl font-semibold">{row.organizationName}</h1>
      <p className="mt-2 text-sm text-muted">
        as {row.invitation.role === "admin" ? "an admin" : "a member"} on Echoboard.
      </p>
    </>
  );

  const session = await getSession();
  const returnTo = encodeURIComponent(`/invite/${id}`);

  if (!session) {
    return (
      <Shell>
        {heading}
        <div className="mt-6 flex flex-col gap-2">
          <ButtonLink href={`/sign-up?next=${returnTo}`}>Create an account</ButtonLink>
          <ButtonLink href={`/sign-in?next=${returnTo}`} variant="secondary">
            I already have an account
          </ButtonLink>
        </div>
      </Shell>
    );
  }

  if (session.user.email.toLowerCase() !== row.invitation.email.toLowerCase()) {
    return (
      <Shell>
        {heading}
        <p className="mt-6 rounded-lg bg-surface-2 p-3 text-sm">
          This invitation was sent to <strong>{row.invitation.email}</strong>, but you&apos;re signed in as{" "}
          <strong>{session.user.email}</strong>.
        </p>
        <form action={signOut} className="mt-4">
          <Button variant="secondary" className="w-full">
            Sign out and switch account
          </Button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      {heading}
      <div className="mt-6">
        <InvitationResponse invitationId={id} />
      </div>
    </Shell>
  );
}
