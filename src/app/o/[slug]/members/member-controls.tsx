"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Button, Field, FormError, Input, Select } from "@/components/ui";
import type { FormState } from "@/lib/forms";
import { cancelInvitation, changeRole, inviteMember, removeMember } from "./actions";

export function InviteForm({ slug }: { slug: string }) {
  const [state, action] = useActionState<FormState, FormData>(inviteMember.bind(null, slug), {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3" noValidate>
      <FormError error={state.error} upgradeRequired={state.upgradeRequired} billingHref={`/o/${slug}/billing`} />
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <Field label="Email" htmlFor="invite-email" error={state.fieldErrors?.email}>
            <Input
              id="invite-email"
              name="email"
              type="email"
              placeholder="teammate@company.com"
              defaultValue={state.success ? "" : state.values?.email}
              aria-invalid={!!state.fieldErrors?.email}
            />
          </Field>
        </div>
        <Field label="Role" htmlFor="invite-role">
          <Select id="invite-role" name="role" defaultValue={state.values?.role ?? "member"}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <SubmitButton className="sm:mt-6.5" pendingLabel="Sending…">
          Send invite
        </SubmitButton>
      </div>
    </form>
  );
}

/** Runs a row-level action and keeps its error next to the row instead of crashing the page. */
function useRowAction() {
  const [pending, startTransition] = useTransition();
  const [state, run] = useActionState<FormState, () => Promise<FormState>>(async (_, fn) => fn(), {});
  return {
    pending,
    error: state.error,
    run: (fn: () => Promise<FormState>) => startTransition(() => run(fn)),
  };
}

export function MemberRowControls({ slug, memberId, role }: { slug: string; memberId: string; role: "member" | "admin" }) {
  const { pending, error, run } = useRowAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Select
          aria-label="Role"
          className="h-8 text-xs"
          defaultValue={role}
          disabled={pending}
          onChange={(event) => run(() => changeRole(slug, memberId, event.target.value as "member" | "admin"))}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </Select>
        <Button variant="danger" className="h-8 px-3 text-xs" disabled={pending} onClick={() => run(() => removeMember(slug, memberId))}>
          Remove
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function CancelInvitationButton({ slug, invitationId }: { slug: string; invitationId: string }) {
  const { pending, error, run } = useRowAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="ghost" className="h-8 px-3 text-xs" disabled={pending} onClick={() => run(() => cancelInvitation(slug, invitationId))}>
        {pending ? "Revoking…" : "Revoke"}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
