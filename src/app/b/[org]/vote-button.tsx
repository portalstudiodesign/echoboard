"use client";

import { useOptimistic, useState, useTransition } from "react";
import { vote } from "./actions";

type VoteState = { voted: boolean; count: number };

/**
 * Flips instantly (optimistic), then settles on the server's answer. If the server
 * refuses, the optimistic state is dropped and the button returns to the last known truth.
 */
export function VoteButton({
  orgSlug,
  postId,
  voteCount,
  hasVoted,
  returnTo,
  size = "md",
}: {
  orgSlug: string;
  postId: string;
  voteCount: number;
  hasVoted: boolean;
  returnTo: string;
  size?: "md" | "lg";
}) {
  const [settled, setSettled] = useState<VoteState>({ voted: hasVoted, count: voteCount });
  const [shown, setShown] = useOptimistic(settled);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();

  function onClick() {
    setError(undefined);
    startTransition(async () => {
      setShown({ voted: !shown.voted, count: shown.count + (shown.voted ? -1 : 1) });
      const result = await vote(orgSlug, postId, returnTo);
      if ("error" in result) setError(result.error);
      else setSettled({ voted: result.voted, count: result.voteCount });
    });
  }

  const dimensions = size === "lg" ? "h-16 w-14 text-base" : "h-14 w-12 text-sm";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={shown.voted}
      aria-label={`${shown.voted ? "Remove your vote" : "Upvote"} (${shown.count} ${shown.count === 1 ? "vote" : "votes"})`}
      title={error}
      className={`flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${dimensions} ${
        shown.voted
          ? "border-accent bg-accent-soft text-accent"
          : "border-border bg-surface text-text hover:border-accent/60 hover:text-accent"
      } ${error ? "border-danger" : ""}`}
    >
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
        <path d="M8 3.5 13 10H3z" fill="currentColor" />
      </svg>
      {shown.count}
    </button>
  );
}
