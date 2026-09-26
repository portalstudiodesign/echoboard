"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { checkBoardLimit } from "@/features/billing/service";
import { createBoard } from "@/features/feedback/service";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { canManageTeam } from "@/lib/roles";
import { requireMembership } from "@/lib/session";
import { slugify, slugPattern } from "@/lib/slug";

const boardSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters").max(40, "Keep it under 40 characters"),
  description: z.string().trim().max(200, "Keep it under 200 characters").optional(),
});

export async function addBoard(orgSlug: string, _: FormState, formData: FormData): Promise<FormState> {
  const { organization, role } = await requireMembership(orgSlug);
  if (!canManageTeam(role)) return { error: "Only owners and admins can create boards." };

  const values = formValues(formData);
  const parsed = boardSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const limit = await checkBoardLimit(db, organization.id);
  if (!limit.allowed) return { error: limit.message, upgradeRequired: true, values };

  const slug = slugify(parsed.data.name);
  if (!slugPattern.test(slug)) return { fieldErrors: { name: "Use at least one letter or number" }, values };

  const created = await createBoard(db, {
    organizationId: organization.id,
    name: parsed.data.name,
    slug,
    description: parsed.data.description || null,
  });
  if (!created) return { fieldErrors: { name: "You already have a board with this name" }, values };

  revalidatePath(`/o/${orgSlug}`);
  revalidatePath(`/b/${orgSlug}`);
  return { success: `Board “${created.name}” created.` };
}
