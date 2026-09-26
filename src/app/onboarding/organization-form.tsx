"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input } from "@/components/ui";
import type { FormState } from "@/lib/forms";
import { slugify } from "@/lib/slug";
import { createOrganization } from "./actions";

export function OrganizationForm() {
  const [state, action] = useActionState<FormState, FormData>(createOrganization, {});
  const [name, setName] = useState(state.values?.name ?? "");
  const [slug, setSlug] = useState(state.values?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Company or product name" htmlFor="name" error={state.fieldErrors?.name}>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!slugEdited) setSlug(slugify(event.target.value));
          }}
          placeholder="Acme"
          aria-invalid={!!state.fieldErrors?.name}
          autoFocus
        />
      </Field>
      <Field
        label="Board address"
        htmlFor="slug"
        hint="Your public board will live here. You can't change it later."
        error={state.fieldErrors?.slug}
      >
        <div className="flex items-center rounded-lg border border-border bg-surface-2 focus-within:border-accent">
          <span className="pl-3 text-sm text-muted select-none">echoboard.app/b/</span>
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value.toLowerCase());
            }}
            placeholder="acme"
            className="border-0 bg-transparent pl-0.5 focus:outline-none"
            aria-invalid={!!state.fieldErrors?.slug}
          />
        </div>
      </Field>
      <SubmitButton pendingLabel="Creating…">Create workspace</SubmitButton>
    </form>
  );
}
