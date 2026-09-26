import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeReturnTo } from "@/lib/forms";
import { getSession } from "@/lib/session";
import { SignInForm } from "../auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  if (await getSession()) redirect(safeReturnTo(next));
  return <SignInForm next={typeof next === "string" ? safeReturnTo(next) : undefined} />;
}
