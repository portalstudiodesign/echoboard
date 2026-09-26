"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, Field, Input } from "@/components/ui";
import type { FormState } from "@/lib/forms";
import { signIn, signUp } from "./actions";

function withNext(path: string, next?: string) {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}

export function SignUpForm({ next, email }: { next?: string; email?: string }) {
  const [state, action] = useActionState<FormState, FormData>(signUp, {});
  const values = state.values ?? { email: email ?? "" };
  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-muted">Start collecting feedback in minutes.</p>
      <form action={action} className="mt-6 flex flex-col gap-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        {state.error && <Alert>{state.error}</Alert>}
        <Field label="Name" htmlFor="name" error={state.fieldErrors?.name}>
          <Input id="name" name="name" autoComplete="name" defaultValue={values.name} aria-invalid={!!state.fieldErrors?.name} autoFocus />
        </Field>
        <Field label="Work email" htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" defaultValue={values.email} aria-invalid={!!state.fieldErrors?.email} />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters." error={state.fieldErrors?.password}>
          <Input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={!!state.fieldErrors?.password} />
        </Field>
        <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={withNext("/sign-in", next)} className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, {});
  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold">Welcome back</h1>
      <p className="mt-1 text-sm text-muted">Sign in to your Echoboard account.</p>
      <form action={action} className="mt-6 flex flex-col gap-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        {state.error && <Alert>{state.error}</Alert>}
        <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} aria-invalid={!!state.fieldErrors?.email} autoFocus />
        </Field>
        <Field label="Password" htmlFor="password" error={state.fieldErrors?.password}>
          <Input id="password" name="password" type="password" autoComplete="current-password" aria-invalid={!!state.fieldErrors?.password} />
        </Field>
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New to Echoboard?{" "}
        <Link href={withNext("/sign-up", next)} className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </Card>
  );
}
