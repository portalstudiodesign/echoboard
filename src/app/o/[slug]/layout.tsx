import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { Button, Logo } from "@/components/ui";
import { requireMembership } from "@/lib/session";
import { OrgNav } from "./org-nav";

export default async function OrganizationLayout({ children, params }: LayoutProps<"/o/[slug]">) {
  const { slug } = await params;
  const { session, organization } = await requireMembership(slug);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4">
          <Link href="/dashboard" aria-label="All workspaces">
            <Logo />
          </Link>
          <span className="text-border" aria-hidden>
            /
          </span>
          <span className="truncate font-medium">{organization.name}</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{session.user.email}</span>
            <form action={signOut}>
              <Button variant="ghost" className="h-8 px-3">
                Sign out
              </Button>
            </form>
          </div>
        </div>
        <OrgNav slug={slug} />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
