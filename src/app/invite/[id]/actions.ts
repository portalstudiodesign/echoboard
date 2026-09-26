"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { authErrorMessage, type FormState } from "@/lib/forms";
import { requireSession } from "@/lib/session";

export async function respondToInvitation(invitationId: string, accept: boolean): Promise<FormState> {
  await requireSession(`/invite/${invitationId}`);
  let slug: string | undefined;
  try {
    if (accept) {
      const result = await auth.api.acceptInvitation({ headers: await headers(), body: { invitationId } });
      const org = await auth.api.getFullOrganization({
        headers: await headers(),
        query: { organizationId: result?.invitation.organizationId },
      });
      slug = org?.slug;
    } else {
      await auth.api.rejectInvitation({ headers: await headers(), body: { invitationId } });
    }
  } catch (error) {
    return { error: authErrorMessage(error) };
  }
  redirect(slug ? `/o/${slug}` : "/dashboard");
}
