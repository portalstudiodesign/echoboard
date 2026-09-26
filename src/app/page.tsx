import Link from "next/link";
import type { ReactNode } from "react";
import { ProductPreview } from "@/components/landing/product-preview";
import { ButtonLink, Logo } from "@/components/ui";
import { planLimits, proPrice } from "@/features/billing/plans";
import { demoSlug } from "@/features/demo/constants";
import { getSession } from "@/lib/session";

const repoUrl = "https://github.com/portalstudiodesign/echoboard";

const steps = [
  { title: "Collect", text: "Customers post ideas on your public board or straight from your product with the widget." },
  { title: "Prioritise", text: "Votes surface what matters most. Merge duplicates so demand is counted in one place." },
  { title: "Close the loop", text: "Move ideas across your roadmap — every voter gets an email when their idea ships." },
];

const features: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: "Public boards & voting",
    text: "One vote per person, enforced by the database. Sort by top or new, filter by status, search in a keystroke.",
    icon: <path d="M12 5 19 14H5z" />,
  },
  {
    title: "A roadmap that writes itself",
    text: "Planned, in progress and shipped — built from the statuses you already set, ranked by votes.",
    icon: <path d="M4 7h10M4 12h16M4 17h7" />,
  },
  {
    title: "Embeddable widget",
    text: "One script tag. Shadow DOM and an iframe keep it from clashing with your CSS — or you with it.",
    icon: <path d="M8 8l-4 4 4 4M16 8l4 4-4 4" />,
  },
  {
    title: "Merge duplicates",
    text: "Fold a duplicate into the original: votes move over, nobody is counted twice, and voters are told.",
    icon: <path d="M6 5v4a5 5 0 0 0 5 5h7M14 10l4 4-4 4M6 19v-4" />,
  },
  {
    title: "Status emails",
    text: "Voters hear about progress automatically. Sent after the response, so the dashboard never waits.",
    icon: <path d="M4 6h16v12H4zM4 7l8 6 8-6" />,
  },
  {
    title: "Your whole team",
    text: "Invite teammates as admins or members. Team replies get a badge so customers know who's talking.",
    icon: <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M21 19a6 6 0 0 0-4-5.6" />,
  },
];

const stack = ["Next.js 16", "TypeScript", "PostgreSQL", "Drizzle ORM", "Better Auth", "Stripe", "Tailwind CSS", "Vitest", "GitHub Actions"];

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0 text-success" aria-hidden>
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlanFeatures({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <Check />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default async function HomePage() {
  const session = await getSession();
  const primaryHref = session ? "/dashboard" : "/sign-up";

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4">
          <Link href="/" aria-label="Echoboard home">
            <Logo />
          </Link>
          <nav className="hidden gap-6 text-sm text-muted md:flex" aria-label="Main">
            <a href="#features" className="hover:text-text">
              Features
            </a>
            <a href="#pricing" className="hover:text-text">
              Pricing
            </a>
            <Link href={`/b/${demoSlug}`} className="hover:text-text">
              Live demo
            </Link>
            <a href={repoUrl} className="hover:text-text">
              GitHub
            </a>
          </nav>
          <div className="ml-auto flex gap-2">
            {session ? (
              <ButtonLink href="/dashboard" variant="secondary">
                Dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/sign-in" variant="ghost" className="hidden sm:inline-flex">
                  Sign in
                </ButtonLink>
                <ButtonLink href="/sign-up">Get started</ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pt-16 pb-24 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
              <span className="size-1.5 rounded-full bg-success" aria-hidden />
              Feedback boards · Roadmaps · Widget
            </p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">Build what your users are asking for.</h1>
            <p className="mt-6 max-w-xl text-lg text-muted text-pretty">
              Echoboard collects feature requests in one place, lets customers vote on them, and tells everyone when you ship — so your
              roadmap is backed by demand, not guesses.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={primaryHref} className="h-11 px-6">
                {session ? "Go to your workspace" : "Create your board — free"}
              </ButtonLink>
              <ButtonLink href={`/b/${demoSlug}`} variant="secondary" className="h-11 px-6">
                See the live demo →
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">No credit card. Set up in under a minute.</p>
          </div>
          <ProductPreview />
        </section>

        <section className="border-y border-border bg-surface">
          <ol className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className="font-mono text-sm text-accent">0{index + 1}</span>
                <h2 className="mt-2 text-lg font-semibold">{step.title}</h2>
                <p className="mt-2 text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-24">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance">Everything you need to turn feedback into a roadmap</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="bg-surface p-6">
                <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent">
                  <svg
                    viewBox="0 0 24 24"
                    className="size-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    {feature.icon}
                  </svg>
                </span>
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-24 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-balance">Feedback without leaving your product</h2>
            <p className="mt-4 text-muted">
              Paste one line before <code className="font-mono text-sm text-text">&lt;/body&gt;</code>. A feedback button appears in the corner,
              opening your ideas and roadmap in a panel — no dependencies, no style conflicts.
            </p>
          </div>
          <pre className="overflow-x-auto rounded-2xl border border-border bg-surface p-5 font-mono text-sm leading-relaxed">
            <code>
              <span className="text-muted">&lt;</span>
              <span className="text-accent">script</span> src=<span className="text-success">&quot;https://echoboard.app/widget.js&quot;</span>
              {"\n        "}data-org=<span className="text-success">&quot;your-team&quot;</span> async<span className="text-muted">&gt;&lt;/</span>
              <span className="text-accent">script</span>
              <span className="text-muted">&gt;</span>
            </code>
          </pre>
        </section>

        <section id="pricing" className="scroll-mt-20 border-t border-border bg-surface">
          <div className="mx-auto w-full max-w-6xl px-4 py-24">
            <h2 className="text-center text-3xl font-semibold tracking-tight">Simple pricing</h2>
            <p className="mt-3 text-center text-muted">Start free. Upgrade when your team grows.</p>
            <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
              <div className="flex flex-col rounded-2xl border border-border bg-bg p-7">
                <h3 className="font-semibold">Free</h3>
                <p className="mt-3">
                  <span className="text-4xl font-semibold">$0</span>
                </p>
                <PlanFeatures
                  items={[
                    `${planLimits.free.boards} feedback board`,
                    `Up to ${planLimits.free.teamSeats} team members`,
                    "Voting, comments & public roadmap",
                    "Embeddable widget",
                    "Status emails to voters",
                  ]}
                />
                <ButtonLink href={primaryHref} variant="secondary" className="mt-8">
                  Start for free
                </ButtonLink>
              </div>
              <div className="flex flex-col rounded-2xl border-2 border-accent bg-bg p-7">
                <h3 className="flex items-center gap-2 font-semibold">
                  Pro <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">For growing teams</span>
                </h3>
                <p className="mt-3">
                  <span className="text-4xl font-semibold">${proPrice.unitAmount / 100}</span>
                  <span className="text-muted"> / month</span>
                </p>
                <PlanFeatures items={["Unlimited boards", "Unlimited team members", "Remove “Powered by Echoboard”", "Everything in Free"]} />
                <ButtonLink href={primaryHref} className="mt-8">
                  Start free, upgrade anytime
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-24">
          <div className="rounded-2xl border border-border bg-surface p-8 sm:p-10">
            <h2 className="text-2xl font-semibold tracking-tight">Built in the open</h2>
            <p className="mt-3 max-w-2xl text-muted">
              Echoboard is a portfolio project built with production habits: integration tests against a real Postgres, CI on every push,
              signature-verified Stripe webhooks, and database-level guarantees for votes and counters. The code and design notes are on
              GitHub.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {stack.map((item) => (
                <li key={item} className="rounded-full border border-border px-3 py-1 text-sm">
                  {item}
                </li>
              ))}
            </ul>
            <ButtonLink href={repoUrl} variant="secondary" className="mt-8">
              View the source on GitHub ↗
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted">
          <Logo className="text-text" />
          <div className="flex gap-6">
            <Link href={`/b/${demoSlug}`} className="hover:text-text">
              Live demo
            </Link>
            <a href={repoUrl} className="hover:text-text">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
