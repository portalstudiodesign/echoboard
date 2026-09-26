"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert } from "@/components/ui";
import type { FormState } from "@/lib/forms";
import { openBillingPortal, startCheckout } from "./actions";

export function UpgradeButton({ slug }: { slug: string }) {
  const [state, action] = useActionState<FormState>(startCheckout.bind(null, slug), {});
  return (
    <form action={action} className="flex flex-col gap-2">
      {state.error && <Alert>{state.error}</Alert>}
      <SubmitButton pendingLabel="Opening checkout…">Upgrade to Pro</SubmitButton>
    </form>
  );
}

export function ManageBillingButton({ slug }: { slug: string }) {
  const [state, action] = useActionState<FormState>(openBillingPortal.bind(null, slug), {});
  return (
    <form action={action} className="flex flex-col gap-2">
      {state.error && <Alert>{state.error}</Alert>}
      <SubmitButton variant="secondary" pendingLabel="Opening…">
        Manage billing
      </SubmitButton>
    </form>
  );
}
