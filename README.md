# Echoboard

Feedback boards and public roadmaps for SaaS teams — collect feature requests, let users vote, and close the loop when you ship.

[![CI](https://github.com/portalstudiodesign/echoboard/actions/workflows/ci.yml/badge.svg)](https://github.com/portalstudiodesign/echoboard/actions/workflows/ci.yml)

A portfolio project built like a product: multi-tenant workspaces, a public board with voting and comments, a
roadmap, an embeddable widget, voter notifications and Stripe subscriptions — with integration tests against a
real Postgres and CI on every push.

**Live:** [echoboard-nine.vercel.app](https://echoboard-nine.vercel.app) · demo board: [/b/orbit](https://echoboard-nine.vercel.app/b/orbit) (a fictional calendar app) — or sign up and create your own workspace.

## Features

- **Workspaces & teams** — sign-up, workspaces, owner/admin/member roles, email invitations.
- **Public boards** — ideas, one vote per person (a composite primary key), comments with team badges,
  statuses, sort/filter/search, pagination.
- **Roadmap** — planned / in progress / shipped across all boards, ranked by votes.
- **Moderation** — merge duplicates (votes move without double counting), delete posts.
- **Close the loop** — voters are emailed on status changes and merges, after the response is sent.
- **Widget** — one `<script>` tag, shadow DOM + iframe isolation (see below).
- **Billing** — Free / Pro with Stripe Checkout, portal and verified webhooks (see below).

## Stack

- **Next.js 16** (App Router, Server Actions) + **TypeScript** + **Tailwind CSS**
- **PostgreSQL** via **Drizzle ORM** — embedded [PGlite](https://pglite.dev) locally and in tests, Neon in production
- **Better Auth** — email/password, organizations, roles, invitations
- **Stripe** — Checkout, customer portal, webhooks
- **Vitest** integration tests against a real (in-memory) Postgres
- **GitHub Actions** CI: lint, typecheck, tests, production build

## Design notes

- **The database guards the invariants.** One vote per user per post is a primary key; vote and comment
  counters are maintained by Postgres triggers, so they stay right even when a voter's account is deleted and
  their votes vanish by cascade. A check constraint stops a post being merged into itself.
- **Domain logic takes the database as a parameter.** `src/features/*` never imports a global connection, so
  the same functions run against Neon in production and a fresh in-memory PGlite in every test.
- **Authorization lives at the edges.** Server actions decide *who* may act (membership, role, plan limits)
  and verify that ids in the URL belong together; the domain layer decides *what* happens.
- **One local database process at a time.** PGlite is single-process, so the connection opens lazily (a build
  never touches it) and a pid lockfile turns a second opener into a clear error instead of corruption.

## Getting started

Requires Node.js 24. No database server or Docker needed.

```bash
npm install
cp .env.example .env   # then set BETTER_AUTH_SECRET
npm run dev            # applies migrations, starts http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Migrate the local database and start the dev server |
| `npm test` | Run the test suite (each test gets a fresh in-memory Postgres) |
| `npm run db:generate` | Create a migration from schema changes |
| `npm run auth:generate` | Regenerate the auth tables after changing the auth config |
| `npm run db:seed` | Reset the public demo workspace (`/b/orbit`) — touches only demo data |

## Deploying (Vercel + Neon)

1. Create a Postgres database on [Neon](https://neon.tech) and copy the **pooled** connection string.
2. Import the repository on [Vercel](https://vercel.com). Set these environment variables for Production:
   `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET` (a long random string), and optionally `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`. `BETTER_AUTH_URL` defaults to the Vercel production domain.
3. Deploy. The `vercel-build` script applies pending migrations before `next build`.
4. Seed the demo once: `DATABASE_URL=<neon url> npm run db:seed`.
5. For Stripe, add a webhook endpoint at `https://<your-domain>/api/stripe/webhook` listening to
   `customer.subscription.*` events and set its signing secret as `STRIPE_WEBHOOK_SECRET`.

## Embeddable widget

Customers add one tag to their site:

```html
<script src="https://your-echoboard.app/widget.js" data-org="acme" async></script>
```

[`public/widget.js`](public/widget.js) is a ~6 KB (unminified) dependency-free loader. It draws a launcher button inside a
**shadow root** (the host page's CSS can't restyle it) and lazily opens `/embed/<org>` in an **iframe** (the
board can't be affected by, or affect, the host page). The frame asks to close via `postMessage`, and the loader
only accepts messages from its own frame's origin and window. `Echoboard.open()`, `close()`, `toggle()` and
`destroy()` let sites use their own button.

**Why the widget is read-only.** Browsers block cookies in cross-site iframes (Safari and Firefox by default,
Chrome increasingly), so a framed page can't reliably tell who is signed in. Rather than a login flow that works
in some browsers only, the widget shows ideas, statuses and the roadmap, and voting or posting opens the full
board in a new tab, where first-party sign-in always works. In-widget voting would need a customer-side identity
hand-off (signed SSO tokens), which is a deliberate non-goal for v1.

**Clickjacking.** Every page sends `frame-ancestors 'self'` / `X-Frame-Options: SAMEORIGIN`, except `/embed/*`,
which exists to be framed and has no actions to hijack.

## Billing

Free (1 board, 3 team seats, “Powered by” branding) and Pro ($19/mo, unlimited) via **Stripe Checkout** and
the **customer portal**. Limits are enforced on the server — in the actions and again in Better Auth's
`membershipLimit`, so accepting an invitation can't bypass the seat cap.

The subscription is mirrored locally as a **full snapshot** of Stripe's object, never a delta, so replayed or
reordered webhooks converge on the same state. The snapshot is written from three places: signature-verified
webhooks (`/api/stripe/webhook`), the Checkout return URL and the portal return URL. The return-URL syncs make
changes show instantly and let billing work locally without a webhook tunnel.

Things learned against the real API (and covered by tests): since API version 2025-03-31 the billing period
lives on the subscription *item*, and the portal schedules cancellations with `cancel_at` rather than
`cancel_at_period_end`. Live keys are refused unless `ALLOW_LIVE_STRIPE=true`.

## Roadmap

- [x] Project setup, database, CI
- [x] Accounts, organizations, roles, invitations
- [x] Public boards: posts, votes, comments, statuses
- [x] Public roadmap, moderation, status-change emails
- [x] Embeddable widget
- [x] Billing (Stripe): Free & Pro plans
- [x] Landing page, demo data, deployment setup
