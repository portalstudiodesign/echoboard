import { ButtonLink, Logo } from "@/components/ui";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <Logo />
        {session ? (
          <ButtonLink href="/dashboard" variant="secondary">
            Open dashboard
          </ButtonLink>
        ) : (
          <div className="flex gap-2">
            <ButtonLink href="/sign-in" variant="ghost">
              Sign in
            </ButtonLink>
            <ButtonLink href="/sign-up">Get started</ButtonLink>
          </div>
        )}
      </header>
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Know what to build next — because your users told you.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted text-pretty">
          Collect feature requests, let customers vote, and share a public roadmap that closes the loop when you ship.
        </p>
        <ButtonLink href={session ? "/dashboard" : "/sign-up"} className="mt-8 h-11 px-6">
          {session ? "Go to your workspace" : "Create your board — free"}
        </ButtonLink>
      </section>
    </main>
  );
}
