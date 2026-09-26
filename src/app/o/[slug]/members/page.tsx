import type { Metadata } from "next";
import { and, asc, eq, gt } from "drizzle-orm";
import { Badge, Card } from "@/components/ui";
import { db } from "@/db/client";
import { invitation, member, user } from "@/db/schema";
import { asRole, canManageTeam } from "@/lib/roles";
import { requireMembership } from "@/lib/session";
import { CancelInvitationButton, InviteForm, MemberRowControls } from "./member-controls";

export const metadata: Metadata = { title: "Team" };

export default async function MembersPage({ params }: PageProps<"/o/[slug]/members">) {
  const { slug } = await params;
  const { session, organization, role } = await requireMembership(slug);
  const manager = canManageTeam(role);

  const [members, invitations] = await Promise.all([
    db
      .select({ id: member.id, role: member.role, userId: user.id, name: user.name, email: user.email })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, organization.id))
      .orderBy(asc(member.createdAt)),
    manager
      ? db
          .select({ id: invitation.id, email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt })
          .from(invitation)
          .where(
            and(
              eq(invitation.organizationId, organization.id),
              eq(invitation.status, "pending"),
              gt(invitation.expiresAt, new Date()),
            ),
          )
          .orderBy(asc(invitation.createdAt))
      : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="mt-1 text-muted">People who can manage {organization.name}&apos;s feedback.</p>
      </div>

      {manager && (
        <Card className="p-6">
          <h2 className="mb-4 font-medium">Invite a teammate</h2>
          <InviteForm slug={slug} />
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Members · {members.length}</h2>
        <Card className="divide-y divide-border">
          {members.map((row) => {
            const rowRole = asRole(row.role);
            const isSelf = row.userId === session.user.id;
            return (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {row.name} {isSelf && <span className="text-sm font-normal text-muted">(you)</span>}
                  </p>
                  <p className="truncate text-sm text-muted">{row.email}</p>
                </div>
                {manager && !isSelf && rowRole !== "owner" ? (
                  <MemberRowControls slug={slug} memberId={row.id} role={rowRole} />
                ) : (
                  <Badge tone={rowRole === "owner" ? "accent" : "neutral"}>{rowRole}</Badge>
                )}
              </div>
            );
          })}
        </Card>
      </section>

      {manager && invitations.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted">Pending invitations · {invitations.length}</h2>
          <Card className="divide-y divide-border">
            {invitations.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.email}</p>
                  <p className="text-sm text-muted">
                    Invited as {row.role ?? "member"} · expires {row.expiresAt.toLocaleDateString("en", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <CancelInvitationButton slug={slug} invitationId={row.id} />
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
