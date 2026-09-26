"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { checkSeatLimit } from "@/features/billing/service";
import { auth } from "@/lib/auth";
import { authErrorMessage, fieldErrors, formValues, type FormState } from "@/lib/forms";
import { canManageTeam } from "@/lib/roles";
import { requireMembership } from "@/lib/session";

const inviteSchema = z.object({
  email: z.email("Enter a valid email address"),
  role: z.enum(["member", "admin"]),
});

async function requireTeamManager(slug: string) {
  const membership = await requireMembership(slug);
  if (!canManageTeam(membership.role)) throw new Error("Only owners and admins can manage the team.");
  return membership;
}

export async function inviteMember(slug: string, _: FormState, formData: FormData): Promise<FormState> {
  const { organization } = await requireTeamManager(slug);
  const values = formValues(formData);
  const parsed = inviteSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const limit = await checkSeatLimit(db, organization.id);
  if (!limit.allowed) return { error: limit.message, upgradeRequired: true, values };

  try {
    await auth.api.createInvitation({
      headers: await headers(),
      body: { ...parsed.data, organizationId: organization.id },
    });
  } catch (error) {
    return { error: authErrorMessage(error), values };
  }
  revalidatePath(`/o/${slug}/members`);
  return { success: `Invitation sent to ${parsed.data.email}.` };
}

export async function cancelInvitation(slug: string, invitationId: string): Promise<FormState> {
  await requireTeamManager(slug);
  try {
    await auth.api.cancelInvitation({ headers: await headers(), body: { invitationId } });
  } catch (error) {
    return { error: authErrorMessage(error) };
  }
  revalidatePath(`/o/${slug}/members`);
  return {};
}

export async function removeMember(slug: string, memberId: string): Promise<FormState> {
  const { organization } = await requireTeamManager(slug);
  try {
    await auth.api.removeMember({
      headers: await headers(),
      body: { memberIdOrEmail: memberId, organizationId: organization.id },
    });
  } catch (error) {
    return { error: authErrorMessage(error) };
  }
  revalidatePath(`/o/${slug}/members`);
  return {};
}

export async function changeRole(slug: string, memberId: string, role: "member" | "admin"): Promise<FormState> {
  const { organization } = await requireTeamManager(slug);
  try {
    await auth.api.updateMemberRole({
      headers: await headers(),
      body: { memberId, role, organizationId: organization.id },
    });
  } catch (error) {
    return { error: authErrorMessage(error) };
  }
  revalidatePath(`/o/${slug}/members`);
  return {};
}
