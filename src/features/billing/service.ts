import { and, count, eq, gt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { board, invitation, member, subscription } from "@/db/schema";
import { planFromStatus, planLimits, type Plan } from "./plans";

/** What we keep from a Stripe subscription — decoupled from the SDK types so it's easy to test. */
export type SubscriptionSnapshot = {
  customerId: string;
  subscriptionId: string;
  status: string;
  priceLookupKey: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

export async function getBilling(db: Db, organizationId: string) {
  const [row] = await db.select().from(subscription).where(eq(subscription.organizationId, organizationId)).limit(1);
  const plan: Plan = planFromStatus(row?.status);
  return { plan, limits: planLimits[plan], subscription: row };
}

export async function getPlan(db: Db, organizationId: string): Promise<Plan> {
  return (await getBilling(db, organizationId)).plan;
}

/** Members plus still-valid pending invitations: an invite reserves a seat. */
export async function countTeamSeats(db: Db, organizationId: string) {
  const [[members], [pending]] = await Promise.all([
    db.select({ value: count() }).from(member).where(eq(member.organizationId, organizationId)),
    db
      .select({ value: count() })
      .from(invitation)
      .where(and(eq(invitation.organizationId, organizationId), eq(invitation.status, "pending"), gt(invitation.expiresAt, new Date()))),
  ]);
  return (members?.value ?? 0) + (pending?.value ?? 0);
}

export type LimitCheck = { allowed: true } | { allowed: false; limit: number; message: string };

export async function checkBoardLimit(db: Db, organizationId: string): Promise<LimitCheck> {
  const [{ limits }, [boards]] = await Promise.all([
    getBilling(db, organizationId),
    db.select({ value: count() }).from(board).where(eq(board.organizationId, organizationId)),
  ]);
  if ((boards?.value ?? 0) < limits.boards) return { allowed: true };
  return {
    allowed: false,
    limit: limits.boards,
    message: `The Free plan includes ${limits.boards} board. Upgrade to Pro for unlimited boards.`,
  };
}

export async function checkSeatLimit(db: Db, organizationId: string): Promise<LimitCheck> {
  const [{ limits }, seats] = await Promise.all([getBilling(db, organizationId), countTeamSeats(db, organizationId)]);
  if (seats < limits.teamSeats) return { allowed: true };
  return {
    allowed: false,
    limit: limits.teamSeats,
    message: `The Free plan includes ${limits.teamSeats} team seats (pending invitations count). Upgrade to Pro for an unlimited team.`,
  };
}

export async function findOrganizationByCustomer(db: Db, customerId: string) {
  const [row] = await db
    .select({ organizationId: subscription.organizationId })
    .from(subscription)
    .where(eq(subscription.stripeCustomerId, customerId))
    .limit(1);
  return row?.organizationId;
}

/** Remembers the Stripe customer created for a workspace, before it has any subscription. */
export async function saveCustomer(db: Db, organizationId: string, customerId: string) {
  await db
    .insert(subscription)
    .values({ organizationId, stripeCustomerId: customerId })
    .onConflictDoUpdate({ target: subscription.organizationId, set: { stripeCustomerId: customerId } });
}

/**
 * Writes Stripe's view of the subscription. Safe to call any number of times, in any order
 * relative to other syncs of the same subscription (webhooks can arrive late or twice):
 * each call stores a full snapshot, it never applies a delta.
 */
export async function applySubscription(db: Db, organizationId: string, snapshot: SubscriptionSnapshot) {
  const values = {
    stripeCustomerId: snapshot.customerId,
    stripeSubscriptionId: snapshot.subscriptionId,
    status: snapshot.status,
    priceLookupKey: snapshot.priceLookupKey,
    currentPeriodEnd: snapshot.currentPeriodEnd,
    cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
  };
  await db
    .insert(subscription)
    .values({ organizationId, ...values })
    .onConflictDoUpdate({ target: subscription.organizationId, set: values });
}
