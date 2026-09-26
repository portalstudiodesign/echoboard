import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { findOrganizationBySlug, listBoards, listPosts, listRoadmap, roadmapStatuses } from "@/features/feedback/service";
import { statusLabels, statusStyles } from "@/features/feedback/statuses";
import { CloseButton } from "./close-button";

export const metadata: Metadata = { robots: { index: false } };

/*
 * The page inside the widget iframe. It is deliberately read-only: browsers block cookies in
 * cross-site iframes (Safari/Firefox always, Chrome increasingly), so the widget can't reliably
 * know who is signed in. Voting and posting open the full board in a new tab, where sign-in works.
 */

function param(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

const external = { target: "_blank", rel: "noopener" } as const;

export default async function EmbedPage({ params, searchParams }: PageProps<"/embed/[org]">) {
  const { org } = await params;
  const query = await searchParams;
  const organization = await findOrganizationBySlug(db, org);
  if (!organization) notFound();

  const view = param(query.view) === "roadmap" ? "roadmap" : "ideas";
  const search = param(query.q).slice(0, 100);

  const boards = await listBoards(db, organization.id);
  const board = boards[0];

  return (
    <div className="flex h-dvh flex-col bg-bg text-sm">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-xs font-semibold text-accent-fg">
          {organization.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{organization.name}</p>
          <p className="text-xs text-muted">Share ideas, vote, follow progress</p>
        </div>
        <CloseButton />
      </header>

      <nav className="flex gap-1 border-b border-border bg-surface px-2" aria-label="Widget sections">
        {(["ideas", "roadmap"] as const).map((tab) => (
          <Link
            key={tab}
            href={`/embed/${org}?view=${tab}`}
            aria-current={view === tab ? "page" : undefined}
            className={`border-b-2 px-3 pt-1 pb-2 transition-colors ${
              view === tab ? "border-accent font-medium text-text" : "border-transparent text-muted hover:text-text"
            }`}
          >
            {tab === "ideas" ? "Ideas" : "Roadmap"}
          </Link>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto">
        {!board ? (
          <p className="p-6 text-center text-muted">This workspace hasn&apos;t opened a board yet.</p>
        ) : view === "ideas" ? (
          <IdeasView orgSlug={org} boardId={board.id} search={search} />
        ) : (
          <RoadmapView orgSlug={org} organizationId={organization.id} />
        )}
      </div>

      <footer className="flex items-center gap-2 border-t border-border bg-surface p-3">
        <a href={`/b/${org}?new=1`} {...external} className="flex h-9 flex-1 items-center justify-center rounded-lg bg-accent font-medium text-accent-fg hover:bg-accent-hover">
          Suggest an idea ↗
        </a>
        <Link href="/" {...external} className="px-2 text-xs text-muted hover:text-text">
          Echoboard
        </Link>
      </footer>
    </div>
  );
}

async function IdeasView({ orgSlug, boardId, search }: { orgSlug: string; boardId: string; search: string }) {
  const { posts } = await listPosts(db, { boardId, search, sort: "top" });
  return (
    <div className="flex flex-col gap-3 p-3">
      {/* A plain GET form: works before (and without) any client JavaScript. */}
      <form action={`/embed/${orgSlug}`} role="search">
        <input type="hidden" name="view" value="ideas" />
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search ideas…"
          aria-label="Search ideas"
          className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-text placeholder:text-muted/70 focus:border-accent focus:outline-2 focus:outline-accent/25"
        />
      </form>
      {posts.length === 0 ? (
        <p className="px-1 py-6 text-center text-muted">{search ? "No ideas match your search." : "No ideas yet — be the first!"}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {posts.map((post) => (
            <li key={post.id}>
              <a
                href={`/b/${orgSlug}/p/${post.id}`}
                {...external}
                className="flex gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-accent/60"
              >
                <span className="flex w-8 shrink-0 flex-col items-center font-semibold tabular-nums">
                  <svg viewBox="0 0 16 16" className="size-3 text-muted" aria-hidden>
                    <path d="M8 3.5 13 10H3z" fill="currentColor" />
                  </svg>
                  {post.voteCount}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium break-words">{post.title}</span>
                  {post.status !== "open" && (
                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyles[post.status]}`}>
                      {statusLabels[post.status]}
                    </span>
                  )}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="px-1 text-center text-xs text-muted">Open an idea to vote or comment.</p>
    </div>
  );
}

async function RoadmapView({ orgSlug, organizationId }: { orgSlug: string; organizationId: string }) {
  const columns = await listRoadmap(db, organizationId, 10);
  return (
    <div className="flex flex-col gap-4 p-3">
      {roadmapStatuses.map((status) => (
        <section key={status}>
          <h2 className="mb-2 px-1 text-xs font-medium tracking-wide text-muted uppercase">
            {statusLabels[status]} · {columns[status].length}
          </h2>
          {columns[status].length === 0 ? (
            <p className="px-1 text-muted">Nothing here yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {columns[status].map((item) => (
                <li key={item.id}>
                  <a
                    href={`/b/${orgSlug}/p/${item.id}`}
                    {...external}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 hover:border-accent/60"
                  >
                    <span className="w-6 shrink-0 text-center font-semibold tabular-nums">{item.voteCount}</span>
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
