import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { Button, ButtonLink } from "@/components/ui";
import { db } from "@/db/client";
import { findOrganizationBySlug, isStaff } from "@/features/feedback/service";
import { getSession } from "@/lib/session";
import { getPublicOrganization } from "./organization";
import { PublicNav } from "./public-nav";

export async function generateMetadata({ params }: LayoutProps<"/b/[org]">): Promise<Metadata> {
  const { org } = await params;
  const found = await findOrganizationBySlug(db, org);
  return found ? { title: { default: `${found.name} feedback`, template: `%s · ${found.name}` } } : {};
}

export default async function PublicBoardLayout({ children, params }: LayoutProps<"/b/[org]">) {
  const { org } = await params;
  const organization = await getPublicOrganization(org);
  const session = await getSession();
  const staff = await isStaff(db, organization.id, session?.user.id);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4">
          <Link href={`/b/${org}`} className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-sm font-semibold text-accent-fg">
              {organization.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="truncate font-semibold">{organization.name}</span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {staff && (
              <ButtonLink href={`/o/${org}`} variant="secondary" className="h-8 px-3">
                Dashboard
              </ButtonLink>
            )}
            {session ? (
              <form action={signOut}>
                <Button variant="ghost" className="h-8 px-3">
                  Sign out
                </Button>
              </form>
            ) : (
              <ButtonLink href={`/sign-in?next=${encodeURIComponent(`/b/${org}`)}`} variant="ghost" className="h-8 px-3">
                Sign in
              </ButtonLink>
            )}
          </div>
        </div>
        <PublicNav orgSlug={org} />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
      <footer className="py-6 text-center text-xs text-muted">
        Powered by{" "}
        <Link href="/" className="font-medium hover:text-text">
          Echoboard
        </Link>
      </footer>
    </div>
  );
}
