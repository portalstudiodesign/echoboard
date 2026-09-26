import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card } from "@/components/ui";
import { db } from "@/db/client";
import { listBoards } from "@/features/feedback/service";
import { canManageTeam } from "@/lib/roles";
import { requireMembership } from "@/lib/session";
import { NewBoardForm } from "./board-form";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({ params }: PageProps<"/o/[slug]">) {
  const { slug } = await params;
  const { organization, role } = await requireMembership(slug);
  const boards = await listBoards(db, organization.id);
  const manager = canManageTeam(role);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{organization.name}</h1>
          <p className="mt-1 text-muted">
            Your public board: <span className="font-mono text-text">/b/{organization.slug}</span>
          </p>
        </div>
        <ButtonLink href={`/b/${organization.slug}`} target="_blank">
          Open public board ↗
        </ButtonLink>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">Boards · {boards.length}</h2>
        {boards.length === 0 ? (
          <Card className="p-6 text-sm text-muted">No boards yet — create one below so customers can start posting.</Card>
        ) : (
          <Card className="divide-y divide-border">
            {boards.map((b) => (
              <Link
                key={b.id}
                href={`/b/${organization.slug}?board=${b.slug}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{b.name}</p>
                  {b.description && <p className="truncate text-sm text-muted">{b.description}</p>}
                </div>
                <span className="shrink-0 text-sm text-muted tabular-nums">
                  {b.postCount} {b.postCount === 1 ? "post" : "posts"}
                </span>
              </Link>
            ))}
          </Card>
        )}
      </section>

      {manager && (
        <Card className="p-6">
          <h2 className="mb-4 font-medium">New board</h2>
          <NewBoardForm orgSlug={slug} />
        </Card>
      )}
    </div>
  );
}
