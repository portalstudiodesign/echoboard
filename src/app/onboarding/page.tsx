import type { Metadata } from "next";
import Link from "next/link";
import { Card, Logo } from "@/components/ui";
import { requireSession } from "@/lib/session";
import { OrganizationForm } from "./organization-form";

export const metadata: Metadata = { title: "Create a workspace" };

export default async function OnboardingPage() {
  const session = await requireSession("/onboarding");
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <Link href="/dashboard" className="mb-8">
        <Logo className="text-lg" />
      </Link>
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-semibold">Set up your workspace</h1>
        <p className="mt-1 mb-6 text-sm text-muted">
          Hi {session.user.name.split(" ")[0]} — a workspace holds your feedback board and your team.
        </p>
        <OrganizationForm />
      </Card>
    </main>
  );
}
