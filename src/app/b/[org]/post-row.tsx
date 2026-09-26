import Link from "next/link";
import { statusLabels, statusStyles, type PostStatus } from "@/features/feedback/statuses";
import { VoteButton } from "./vote-button";

export function StatusBadge({ status }: { status: PostStatus }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}>{statusLabels[status]}</span>;
}

export function CommentCount({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted" aria-label={`${count} comments`}>
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
        <path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
      {count}
    </span>
  );
}

export function PostRow({
  orgSlug,
  returnTo,
  post,
}: {
  orgSlug: string;
  returnTo: string;
  post: { id: string; title: string; body: string; status: PostStatus; voteCount: number; commentCount: number; hasVoted: boolean };
}) {
  return (
    <li className="flex gap-4 px-4 py-4">
      <VoteButton orgSlug={orgSlug} postId={post.id} voteCount={post.voteCount} hasVoted={post.hasVoted} returnTo={returnTo} />
      <div className="min-w-0 flex-1">
        <Link href={`/b/${orgSlug}/p/${post.id}`} className="font-medium break-words hover:text-accent">
          {post.title}
        </Link>
        {post.body && <p className="mt-1 line-clamp-2 text-sm break-words text-muted">{post.body}</p>}
        <div className="mt-2 flex items-center gap-3">
          {post.status !== "open" && <StatusBadge status={post.status} />}
          <CommentCount count={post.commentCount} />
        </div>
      </div>
    </li>
  );
}
