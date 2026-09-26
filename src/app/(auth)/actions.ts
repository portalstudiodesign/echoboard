"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { authErrorMessage, fieldErrors, formValues, safeReturnTo, type FormState } from "@/lib/forms";

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters").max(128),
});

const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = signUpSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  try {
    await auth.api.signUpEmail({ body: parsed.data, headers: await headers() });
  } catch (error) {
    return { error: authErrorMessage(error), values };
  }
  redirect(safeReturnTo(values.next));
}

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (error) {
    return { error: authErrorMessage(error), values };
  }
  redirect(safeReturnTo(values.next));
}

export async function signOut(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
