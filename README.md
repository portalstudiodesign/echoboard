# Echoboard

Feedback boards and public roadmaps for SaaS teams — collect feature requests, let users vote, and close the loop when you ship.

> 🚧 Work in progress. Built in public as a portfolio project.

## Stack

- **Next.js 16** (App Router, Server Actions) + **TypeScript** + **Tailwind CSS**
- **PostgreSQL** via **Drizzle ORM** — embedded [PGlite](https://pglite.dev) locally and in tests, Neon in production
- **Better Auth** — email/password, organizations, roles, invitations
- **Vitest** integration tests against a real (in-memory) Postgres
- **GitHub Actions** CI: lint, typecheck, tests, production build

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
- [ ] Landing page, demo data, deployment
