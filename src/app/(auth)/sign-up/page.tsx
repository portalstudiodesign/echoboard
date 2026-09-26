import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { invitation } from "@/db/schema";
import { safeReturnTo } from "@/lib/forms";
import { getSession } from "@/lib/session";
import { SignUpForm } from "../auth-forms";

export const metadata: Metadata = { title: "Create account" };

/** When signing up from an invitation link, pre-fill the invited address (kept out of the URL). */
async function invitedEmail(next: string | undefined) {
  const invitationId = next?.match(/^\/invite\/([\w-]+)$/)?.[1];
  if (!invitationId) return undefined;
  const [row] = await db.select({ email: invitation.email }).from(invitation).where(eq(invitation.id, invitationId)).limit(1);
  return row?.email;
}

export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const { next: rawNext } = await searchParams;
  if (await getSession()) redirect(safeReturnTo(rawNext));
  const next = typeof rawNext === "string" ? safeReturnTo(rawNext) : undefined;
  return <SignUpForm next={next} email={await invitedEmail(next)} />;
}
