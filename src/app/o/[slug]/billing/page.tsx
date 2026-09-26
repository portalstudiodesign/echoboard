import type { Metadata } from "next";
import { count, eq } from "drizzle-orm";
import { Alert, Badge, Card } from "@/components/ui";
import { db } from "@/db/client";
import { board } from "@/db/schema";
import { planLimits, proPrice } from "@/features/billing/plans";
import { countTeamSeats, getBilling } from "@/features/billing/service";
import { isBillingConfigured } from "@/features/billing/stripe";
import { requireMembership } from "@/lib/session";
import { ManageBillingButton, UpgradeButton } from "./billing-buttons";

export const metadata: Metadata = { title: "Billing" };

function Usage({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = !Number.isFinite(limit);
  const full = !unlimited && used >= limit;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={`tabular-nums ${full ? "font-medium text-danger" : "text-muted"}`}>
          {used} / {unlimited ? "∞" : limit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className={`h-full rounded-full ${full ? "bg-danger" : "bg-accent"}`} style={{ width: unlimited ? "8%" : `${Math.min(100, (used / limit) * 100)}%` }} />
      </div>
    </div>
  );
}

const proFeatures = ["Unlimited boards", "Unlimited team seats", "No “Powered by Echoboard” on your board and widget"];

export default async function BillingPage({ params, searchParams }: PageProps<"/o/[slug]/billing">) {
  const { slug } = await params;
  const { upgraded } = await searchParams;
  const { organization, role } = await requireMembership(slug);
  const [{ plan, limits, subscription }, seats, [boards]] = await Promise.all([
    getBilling(db, organization.id),
    countTeamSeats(db, organization.id),
    db.select({ value: count() }).from(board).where(eq(board.organizationId, organization.id)),
  ]);
  const isOwner = role === "owner";
  const configured = isBillingConfigured();
  const price = `$${proPrice.unitAmount / 100}`;
  const renewal = subscription?.currentPeriodEnd?.toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-muted">Your plan and what it includes.</p>
      </div>

      {upgraded === "1" && plan === "pro" && <Alert tone="success">Welcome to Pro! Your new limits apply right away.</Alert>}
      {subscription?.status === "past_due" && (
        <Alert>Your last payment failed. Stripe will retry — update your card in “Manage billing” to keep Pro.</Alert>
      )}

      <Card className="flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{plan === "pro" ? "Pro" : "Free"}</h2>
            <Badge tone={plan === "pro" ? "accent" : "neutral"}>Current plan</Badge>
          </div>
          {plan === "pro" && renewal && (
            <p className="text-sm text-muted">{subscription?.cancelAtPeriodEnd ? `Ends on ${renewal}` : `Renews on ${renewal}`}</p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Usage label="Boards" used={boards?.value ?? 0} limit={limits.boards} />
          <Usage label="Team seats" used={seats} limit={limits.teamSeats} />
        </div>
        {plan === "pro" && isOwner && configured && (
          <div className="self-start">
            <ManageBillingButton slug={slug} />
          </div>
        )}
      </Card>

      {plan === "free" && (
        <Card className="flex flex-col gap-4 border-accent/40 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Echoboard Pro</h2>
            <p>
              <span className="text-2xl font-semibold">{price}</span>
              <span className="text-muted"> / month</span>
            </p>
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {proFeatures.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <span className="text-success" aria-hidden>
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>
          {!configured ? (
            <p className="text-sm text-muted">Payments aren&apos;t enabled on this server yet.</p>
          ) : isOwner ? (
            <div className="flex flex-col gap-2 self-start">
              <UpgradeButton slug={slug} />
              <p className="text-xs text-muted">Test mode — use card 4242 4242 4242 4242, any future date and CVC.</p>
            </div>
          ) : (
            <p className="text-sm text-muted">Ask the workspace owner to upgrade.</p>
          )}
        </Card>
      )}

      <p className="text-xs text-muted">
        Free includes {planLimits.free.boards} board and {planLimits.free.teamSeats} team seats. Pending invitations hold a seat until they&apos;re
        accepted, revoked or expire.
      </p>
    </div>
  );
}
