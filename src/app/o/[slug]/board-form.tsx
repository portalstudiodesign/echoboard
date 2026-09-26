"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input } from "@/components/ui";
import type { FormState } from "@/lib/forms";
import { addBoard } from "./actions";

export function NewBoardForm({ orgSlug }: { orgSlug: string }) {
  const [state, action] = useActionState<FormState, FormData>(addBoard.bind(null, orgSlug), {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3" noValidate>
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <Field label="Name" htmlFor="board-name" error={state.fieldErrors?.name}>
          <Input id="board-name" name="name" placeholder="Bug reports" defaultValue={state.success ? "" : state.values?.name} aria-invalid={!!state.fieldErrors?.name} />
        </Field>
        <Field label="Description" htmlFor="board-description" error={state.fieldErrors?.description}>
          <Input
            id="board-description"
            name="description"
            placeholder="Something not working? Let us know."
            defaultValue={state.success ? "" : state.values?.description}
            aria-invalid={!!state.fieldErrors?.description}
          />
        </Field>
      </div>
      <SubmitButton variant="secondary" className="self-start" pendingLabel="Creating…">
        Create board
      </SubmitButton>
    </form>
  );
}
