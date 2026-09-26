"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { authErrorMessage, fieldErrors, formValues, type FormState } from "@/lib/forms";
import { requireSession } from "@/lib/session";
import { slugPattern } from "@/lib/slug";

const organizationSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters").max(60),
  slug: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters")
    .max(40, "Use at most 40 characters")
    .regex(slugPattern, "Use lowercase letters, numbers and single dashes"),
});

export async function createOrganization(_: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  const parsed = organizationSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  try {
    await auth.api.createOrganization({ body: parsed.data, headers: await headers() });
  } catch (error) {
    const message = authErrorMessage(error);
    if (/slug|exists/i.test(message)) {
      return { fieldErrors: { slug: "That address is already taken" }, values };
    }
    return { error: message, values };
  }
  redirect(`/o/${parsed.data.slug}`);
}
