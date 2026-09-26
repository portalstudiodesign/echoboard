import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db/client";
import { listRoadmap, roadmapStatuses } from "@/features/feedback/service";
import { statusLabels } from "@/features/feedback/statuses";
import { getPublicOrganization } from "../organization";

export const metadata: Metadata = { title: "Roadmap" };

const columnAccent: Record<(typeof roadmapStatuses)[number], string> = {
  planned: "bg-sky-500",
  in_progress: "bg-accent",
  complete: "bg-success",
};

const emptyCopy: Record<(typeof roadmapStatuses)[number], string> = {
  planned: "Nothing planned yet.",
  in_progress: "Nothing in progress right now.",
  complete: "Nothing shipped yet.",
};

export default async function RoadmapPage({ params }: PageProps<"/b/[org]/roadmap">) {
  const { org } = await params;
  const organization = await getPublicOrganization(org);
  const columns = await listRoadmap(db, organization.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roadmap</h1>
        <p className="mt-1 text-muted">What {organization.name} is planning, building and has shipped — shaped by your votes.</p>
      </div>
      {/* Bleeds past the 768px page column only where the viewport has room for it (lg ≥ 1024, xl ≥ 1280). */}
      <div className="grid gap-4 md:grid-cols-3 lg:-mx-24 xl:-mx-40">
        {roadmapStatuses.map((status) => (
          <section key={status} className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2/60 p-3" aria-labelledby={`col-${status}`}>
            <h2 id={`col-${status}`} className="flex items-center gap-2 px-1 text-sm font-medium">
              <span className={`size-2 rounded-full ${columnAccent[status]}`} aria-hidden />
              {statusLabels[status]}
              <span className="ml-auto text-muted tabular-nums">{columns[status].length}</span>
            </h2>
            {columns[status].length === 0 ? (
              <p className="px-1 pb-2 text-sm text-muted">{emptyCopy[status]}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {columns[status].map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/b/${org}/p/${item.id}`}
                      className="flex gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-accent/60"
                    >
                      <span className="flex w-8 shrink-0 flex-col items-center text-sm font-semibold tabular-nums">
                        <svg viewBox="0 0 16 16" className="size-3 text-muted" aria-hidden>
                          <path d="M8 3.5 13 10H3z" fill="currentColor" />
                        </svg>
                        {item.voteCount}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium break-words">{item.title}</span>
                        <span className="mt-0.5 block text-xs text-muted">{item.boardName}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
