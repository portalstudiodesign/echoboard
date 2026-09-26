import { isAPIError } from "better-auth/api";
import type { z } from "zod";

export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string | undefined>;
  /** Set when the action was refused because of the plan — the form offers a way to upgrade. */
  upgradeRequired?: boolean;
  /** Echoed back so fields keep their input after a failed submit. */
  values?: Record<string, string>;
};

export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) values[key] = value;
  }
  return values;
}

export function fieldErrors(error: z.ZodError): Record<string, string | undefined> {
  const errors: Record<string, string | undefined> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Turns a Better Auth API error into a user-facing message; anything else is a bug and is rethrown. */
export function authErrorMessage(error: unknown): string {
  if (isAPIError(error)) return error.body?.message ?? error.message;
  throw error;
}

/** Only same-site relative paths are allowed as post-login destinations (no open redirects). */
export function safeReturnTo(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
