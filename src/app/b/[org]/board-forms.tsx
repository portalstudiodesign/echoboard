"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { postStatuses, statusLabels } from "@/features/feedback/statuses";
import type { FormState } from "@/lib/forms";
import { changeStatus, removePost, submitComment, submitPost } from "./actions";

const textareaClass =
  "min-h-28 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted/70 focus:border-accent focus:outline-2 focus:outline-accent/25 aria-invalid:border-danger";

export function NewPostForm({ orgSlug, boardId, boardName }: { orgSlug: string; boardId: string; boardName: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<FormState, FormData>(submitPost.bind(null, orgSlug, boardId), {});

  if (!open && !state.fieldErrors && !state.error) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center rounded-xl border border-dashed border-border bg-surface px-4 text-left text-sm text-muted transition-colors hover:border-accent/60 hover:text-text"
      >
        Suggest an idea for {boardName}…
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4" noValidate>
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Title" htmlFor="post-title" error={state.fieldErrors?.title}>
        <Input
          id="post-title"
          name="title"
          placeholder="Short, descriptive title"
          defaultValue={state.values?.title}
          aria-invalid={!!state.fieldErrors?.title}
          maxLength={120}
          autoFocus
        />
      </Field>
      <Field label="Details" htmlFor="post-body" hint="Optional. What problem would this solve for you?" error={state.fieldErrors?.body}>
        <textarea id="post-body" name="body" className={textareaClass} defaultValue={state.values?.body} aria-invalid={!!state.fieldErrors?.body} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <SubmitButton pendingLabel="Posting…">Post idea</SubmitButton>
      </div>
    </form>
  );
}

export function CommentForm({ orgSlug, postId }: { orgSlug: string; postId: string }) {
  const [state, action] = useActionState<FormState, FormData>(submitComment.bind(null, orgSlug, postId), {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2" noValidate>
      {state.error && <Alert>{state.error}</Alert>}
      <label htmlFor="comment-body" className="sr-only">
        Comment
      </label>
      <textarea
        id="comment-body"
        name="body"
        placeholder="Add a comment…"
        className={`${textareaClass} min-h-20`}
        defaultValue={state.success ? "" : state.values?.body}
        aria-invalid={!!state.fieldErrors?.body}
      />
      {state.fieldErrors?.body && <p className="text-sm text-danger">{state.fieldErrors.body}</p>}
      <SubmitButton className="self-end" pendingLabel="Posting…">
        Comment
      </SubmitButton>
    </form>
  );
}

export function StaffControls({ orgSlug, postId, status }: { orgSlug: string; postId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">Team controls</p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="post-status" className="text-sm">
          Status
        </label>
        <Select
          id="post-status"
          defaultValue={status}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value;
            startTransition(async () => {
              const result = await changeStatus(orgSlug, postId, next);
              setError(result.error);
            });
          }}
        >
          {postStatuses.map((value) => (
            <option key={value} value={value}>
              {statusLabels[value]}
            </option>
          ))}
        </Select>
        <Button
          variant="danger"
          className="ml-auto"
          disabled={pending}
          onClick={() => {
            if (confirm("Delete this post with all its votes and comments? This can't be undone.")) {
              startTransition(() => removePost(orgSlug, postId));
            }
          }}
        >
          Delete post
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export function BoardFilters({ sort, status, search }: { sort: string; status: string; search: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(search);

  function update(changes: Record<string, string>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    startTransition(() => router.replace(`?${params}`, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-busy={pending}>
      <div className="flex rounded-lg border border-border bg-surface p-0.5 text-sm" role="group" aria-label="Sort">
        {[
          ["top", "Top"],
          ["new", "New"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={sort === value}
            onClick={() => update({ sort: value === "top" ? "" : value })}
            className={`rounded-md px-3 py-1.5 transition-colors ${sort === value ? "bg-surface-2 font-medium text-text" : "text-muted hover:text-text"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <Select aria-label="Status" value={status} onChange={(event) => update({ status: event.target.value === "active" ? "" : event.target.value })}>
        <option value="active">All active</option>
        {postStatuses.map((value) => (
          <option key={value} value={value}>
            {statusLabels[value]}
          </option>
        ))}
      </Select>
      <form
        role="search"
        className="min-w-40 flex-1"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: query.trim() });
        }}
      >
        <Input type="search" aria-label="Search ideas" placeholder="Search ideas…" value={query} onChange={(event) => setQuery(event.target.value)} />
      </form>
    </div>
  );
}
