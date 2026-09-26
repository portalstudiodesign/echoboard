"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui";
import type { FormState } from "@/lib/forms";
import { respondToInvitation } from "./actions";

export function InvitationResponse({ invitationId }: { invitationId: string }) {
  const [acceptState, accept] = useActionState<FormState>(respondToInvitation.bind(null, invitationId, true), {});
  const [declineState, decline] = useActionState<FormState>(respondToInvitation.bind(null, invitationId, false), {});
  const error = acceptState.error ?? declineState.error;
  return (
    <div className="flex flex-col gap-3">
      {error && <Alert>{error}</Alert>}
      <div className="flex gap-2">
        <form action={accept} className="flex-1">
          <SubmitButton className="w-full" pendingLabel="Joining…">
            Accept invitation
          </SubmitButton>
        </form>
        <form action={decline}>
          <SubmitButton variant="secondary" pendingLabel="Declining…">
            Decline
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
