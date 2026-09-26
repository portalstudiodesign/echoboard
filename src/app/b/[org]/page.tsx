import Link from "next/link";
import { ButtonLink, Card } from "@/components/ui";
import { db } from "@/db/client";
import { listBoards, listPosts, type PostSort } from "@/features/feedback/service";
import { postStatuses, type PostStatus } from "@/features/feedback/statuses";
import { getSession } from "@/lib/session";
import { BoardFilters, NewPostForm } from "./board-forms";
import { getPublicOrganization } from "./organization";
import { PostRow } from "./post-row";

function param(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function PublicBoardPage({ params, searchParams }: PageProps<"/b/[org]">) {
  const { org } = await params;
  const query = await searchParams;
  const organization = await getPublicOrganization(org);
  const session = await getSession();
  const boards = await listBoards(db, organization.id);

  if (boards.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h1 className="text-lg font-semibold">Nothing here yet</h1>
        <p className="mt-1 text-sm text-muted">{organization.name} hasn&apos;t opened a feedback board yet.</p>
      </Card>
    );
  }

  const current = boards.find((b) => b.slug === param(query.board)) ?? boards[0];
  const sort: PostSort = param(query.sort) === "new" ? "new" : "top";
  const status = (postStatuses as readonly string[]).includes(param(query.status)) ? (param(query.status) as PostStatus) : "active";
  const search = param(query.q);
  const page = Math.max(1, Number.parseInt(param(query.page), 10) || 1);

  const { posts, hasMore } = await listPosts(db, { boardId: current.id, viewerId: session?.user.id, sort, status, search, page });

  const currentQuery = new URLSearchParams(
    Object.entries({ board: param(query.board), sort: param(query.sort), status: param(query.status), q: search, page: page > 1 ? String(page) : "" }).filter(
      ([, v]) => v,
    ),
  );
  const returnTo = `/b/${org}${currentQuery.size ? `?${currentQuery}` : ""}`;
  const wantsToPost = param(query.new) === "1";
  const pageHref = (target: number) => {
    const next = new URLSearchParams(currentQuery);
    if (target > 1) next.set("page", String(target));
    else next.delete("page");
    return `/b/${org}${next.size ? `?${next}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{current.name}</h1>
        {current.description && <p className="mt-1 text-muted">{current.description}</p>}
      </div>

      {boards.length > 1 && (
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1" aria-label="Boards">
          {boards.map((b) => (
            <Link
              key={b.id}
              href={`/b/${org}?board=${b.slug}`}
              aria-current={b.id === current.id ? "page" : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors ${
                b.id === current.id ? "bg-text font-medium text-bg" : "bg-surface-2 text-muted hover:text-text"
              }`}
            >
              {b.name}
            </Link>
          ))}
        </nav>
      )}

      {session ? (
        <NewPostForm key={current.id} orgSlug={org} boardId={current.id} boardName={current.name} initiallyOpen={wantsToPost} />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-surface px-4 py-3">
          <p className="text-sm text-muted">Sign in to suggest ideas and vote.</p>
          {/* Arriving from the widget's "Suggest an idea" keeps that intent through sign-in. */}
          <ButtonLink href={`/sign-in?next=${encodeURIComponent(wantsToPost ? `/b/${org}?new=1` : returnTo)}`} variant="secondary" className="h-8 px-3">
            Sign in
          </ButtonLink>
        </div>
      )}

      <BoardFilters key={`${current.id}-${search}`} sort={sort} status={status} search={search} />

      {posts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-medium">{search || status !== "active" ? "No ideas match these filters." : "No ideas yet."}</p>
          <p className="mt-1 text-sm text-muted">{search || status !== "active" ? "Try a different search or status." : "Be the first to suggest one."}</p>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {posts.map((post) => (
              <PostRow key={post.id} orgSlug={org} returnTo={returnTo} post={post} />
            ))}
          </ul>
        </Card>
      )}

      {(page > 1 || hasMore) && (
        <nav className="flex items-center justify-between" aria-label="Pagination">
          {page > 1 ? (
            <ButtonLink href={pageHref(page - 1)} variant="secondary">
              ← Previous
            </ButtonLink>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">Page {page}</span>
          {hasMore ? (
            <ButtonLink href={pageHref(page + 1)} variant="secondary">
              Next →
            </ButtonLink>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
