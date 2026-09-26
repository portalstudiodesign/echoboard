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

## Roadmap

- [x] Project setup, database, CI
- [x] Accounts, organizations, roles, invitations
- [x] Public boards: posts, votes, comments, statuses
- [ ] Public roadmap, moderation, status-change emails
- [ ] Embeddable widget
- [ ] Billing (Stripe): Free & Pro plans
- [ ] Landing page, demo data, deployment
