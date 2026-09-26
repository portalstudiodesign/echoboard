import type { Metadata } from "next";
import { ButtonLink, Card } from "@/components/ui";
import { canManageTeam } from "@/lib/roles";
import { requireMembership } from "@/lib/session";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({ params }: PageProps<"/o/[slug]">) {
  const { slug } = await params;
  const { organization, role } = await requireMembership(slug);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{organization.name}</h1>
        <p className="mt-1 text-muted">Your workspace is ready.</p>
      </div>
      <Card className="p-6">
        <h2 className="font-medium">Feedback board</h2>
        <p className="mt-1 text-sm text-muted">
          Boards, posts and voting arrive in the next milestone. Your public address is reserved:{" "}
          <span className="font-mono text-text">/b/{organization.slug}</span>
        </p>
      </Card>
      {canManageTeam(role) && (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="font-medium">Invite your team</h2>
            <p className="mt-1 text-sm text-muted">Teammates can triage feedback and update statuses.</p>
          </div>
          <ButtonLink href={`/o/${slug}/members`} variant="secondary">
            Manage team
          </ButtonLink>
        </Card>
      )}
    </div>
  );
}
