import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ButtonLink, Card } from "@/components/ui";
import { db } from "@/db/client";
import { getPost, isStaff, listComments, staffUserIds } from "@/features/feedback/service";
import { getSession } from "@/lib/session";
import { timeAgo } from "@/lib/time";
import { CommentForm, StaffControls } from "../../board-forms";
import { getPublicOrganization } from "../../organization";
import { StatusBadge } from "../../post-row";
import { VoteButton } from "../../vote-button";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The post, only if it belongs to the organization in the URL. */
const loadPost = cache(async (orgSlug: string, postId: string, viewerId?: string) => {
  if (!uuidPattern.test(postId)) notFound();
  const organization = await getPublicOrganization(orgSlug);
  const found = await getPost(db, postId, viewerId);
  if (!found || found.board.organizationId !== organization.id) notFound();
  return { organization, post: found };
});

export async function generateMetadata({ params }: PageProps<"/b/[org]/p/[id]">): Promise<Metadata> {
  const { org, id } = await params;
  const { post } = await loadPost(org, id);
  return { title: post.title, description: post.body.slice(0, 160) || undefined };
}

export default async function PostPage({ params }: PageProps<"/b/[org]/p/[id]">) {
  const { org, id } = await params;
  const session = await getSession();
  const { organization, post } = await loadPost(org, id, session?.user.id);
  const comments = await listComments(db, post.id);
  const [viewerIsStaff, staffAuthors] = await Promise.all([
    isStaff(db, organization.id, session?.user.id),
    staffUserIds(db, organization.id, [...new Set(comments.flatMap((c) => (c.authorId ? [c.authorId] : [])))]),
  ]);
  const returnTo = `/b/${org}/p/${post.id}`;

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/b/${org}?board=${post.board.slug}`} className="self-start text-sm text-muted hover:text-text">
        ← {post.board.name}
      </Link>

      <article className="flex gap-4">
        <VoteButton orgSlug={org} postId={post.id} voteCount={post.voteCount} hasVoted={post.hasVoted} returnTo={returnTo} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{post.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <StatusBadge status={post.status} />
            <span>
              {post.authorName ?? "Deleted user"} · {timeAgo(post.createdAt)}
            </span>
          </div>
          {post.body && <p className="mt-4 break-words whitespace-pre-wrap">{post.body}</p>}
        </div>
      </article>

      {viewerIsStaff && <StaffControls key={post.status} orgSlug={org} postId={post.id} status={post.status} />}

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">
          {comments.length === 0 ? "Comments" : `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}
        </h2>
        {comments.length > 0 && (
          <Card>
            <ul className="divide-y divide-border">
              {comments.map((comment) => {
                const fromTeam = !!comment.authorId && staffAuthors.has(comment.authorId);
                return (
                  <li key={comment.id} className={`px-4 py-3 ${fromTeam ? "bg-accent-soft/40" : ""}`}>
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{comment.authorName ?? "Deleted user"}</span>
                      {fromTeam && (
                        <span className="rounded-full bg-accent px-1.5 py-px text-[10px] font-semibold tracking-wide text-accent-fg uppercase">
                          {organization.name} team
                        </span>
                      )}
                      <span className="text-muted">{timeAgo(comment.createdAt)}</span>
                    </p>
                    <p className="mt-1 text-sm break-words whitespace-pre-wrap">{comment.body}</p>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
        {session ? (
          <CommentForm orgSlug={org} postId={post.id} />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-surface px-4 py-3">
            <p className="text-sm text-muted">Sign in to join the conversation.</p>
            <ButtonLink href={`/sign-in?next=${encodeURIComponent(returnTo)}`} variant="secondary" className="h-8 px-3">
              Sign in
            </ButtonLink>
          </div>
        )}
      </section>
    </div>
  );
}
