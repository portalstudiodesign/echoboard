import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { invitation, member } from "@/db/schema";
import { createBoard } from "@/features/feedback/service";
import { createTestDb } from "@/test/db";
import { createOrganization, createUser } from "@/test/fixtures";
import { planFromStatus } from "./plans";
import { applySubscription, checkBoardLimit, checkSeatLimit, getBilling, saveCustomer, type SubscriptionSnapshot } from "./service";
import { InvalidSignatureError, processWebhook, snapshotFromStripe } from "./stripe";

const activePro: SubscriptionSnapshot = {
  customerId: "cus_123",
  subscriptionId: "sub_123",
  status: "active",
  priceLookupKey: "echoboard_pro_monthly",
  currentPeriodEnd: new Date("2026-11-01T00:00:00Z"),
  cancelAt: null,
};

/** The subset of a Stripe subscription object our code reads, shaped like the real API payload. */
function stripeSubscription(
  overrides: { status?: string; metadata?: Record<string, string>; customer?: string; cancel_at?: number; cancel_at_period_end?: boolean } = {},
) {
  return {
    id: "sub_123",
    object: "subscription",
    customer: overrides.customer ?? "cus_123",
    status: overrides.status ?? "active",
    cancel_at: overrides.cancel_at ?? null,
    cancel_at_period_end: overrides.cancel_at_period_end ?? false,
    metadata: overrides.metadata ?? {},
    items: { data: [{ current_period_end: 1_793_491_200, price: { lookup_key: "echoboard_pro_monthly" } }] },
  } as unknown as Stripe.Subscription;
}

describe("billing", () => {
  let db: Db;
  let orgId: string;
  let ownerId: string;

  beforeEach(async () => {
    db = await createTestDb();
    ownerId = (await createUser(db, "Ana")).id;
    orgId = (await createOrganization(db, ownerId)).id;
  });

  it.each([
    ["active", "pro"],
    ["trialing", "pro"],
    ["past_due", "pro"], // grace period while Stripe retries the card
    ["canceled", "free"],
    ["unpaid", "free"],
    ["incomplete", "free"],
    [undefined, "free"],
  ])("maps Stripe status %s to the %s plan", (status, plan) => {
    expect(planFromStatus(status)).toBe(plan);
  });

  it("starts every workspace on Free", async () => {
    expect((await getBilling(db, orgId)).plan).toBe("free");
  });

  it("limits Free workspaces to one board, and lifts the limit on Pro", async () => {
    await createBoard(db, { organizationId: orgId, name: "Ideas", slug: "ideas" });
    expect(await checkBoardLimit(db, orgId)).toMatchObject({ allowed: false, limit: 1 });

    await applySubscription(db, orgId, activePro);
    expect(await checkBoardLimit(db, orgId)).toEqual({ allowed: true });
  });

  it("counts pending invitations towards the team seat limit, but not expired ones", async () => {
    const invite = (expiresAt: Date) =>
      db.insert(invitation).values({ id: randomUUID(), organizationId: orgId, email: `${randomUUID()}@x.test`, status: "pending", expiresAt, inviterId: ownerId });
    await db.insert(member).values({ id: randomUUID(), organizationId: orgId, userId: (await createUser(db)).id, role: "member", createdAt: new Date() });
    await invite(new Date(Date.now() - 1000)); // expired: frees its seat
    expect(await checkSeatLimit(db, orgId)).toEqual({ allowed: true }); // 2 of 3

    await invite(new Date(Date.now() + 86_400_000));
    expect(await checkSeatLimit(db, orgId)).toMatchObject({ allowed: false, limit: 3 });
  });

  it("stores full snapshots, so replayed or out-of-order syncs converge", async () => {
    await applySubscription(db, orgId, activePro);
    await applySubscription(db, orgId, { ...activePro, status: "canceled" });
    await applySubscription(db, orgId, { ...activePro, status: "canceled" });
    const billing = await getBilling(db, orgId);
    expect([billing.plan, billing.subscription?.status]).toEqual(["free", "canceled"]);
  });

  it("reads the billing period from the subscription item (API 2025-03-31+)", () => {
    expect(snapshotFromStripe(stripeSubscription())).toMatchObject({
      customerId: "cus_123",
      priceLookupKey: "echoboard_pro_monthly",
      currentPeriodEnd: new Date(1_793_491_200 * 1000),
    });
  });

  it("recognises a scheduled cancellation however Stripe expresses it", () => {
    // The billing portal sets cancel_at and leaves cancel_at_period_end false (seen against the real API).
    expect(snapshotFromStripe(stripeSubscription({ cancel_at: 1_793_000_000 })).cancelAt).toEqual(new Date(1_793_000_000 * 1000));
    // The API flag alone means "at the end of the current period".
    expect(snapshotFromStripe(stripeSubscription({ cancel_at_period_end: true })).cancelAt).toEqual(new Date(1_793_491_200 * 1000));
    expect(snapshotFromStripe(stripeSubscription()).cancelAt).toBeNull();
  });

  describe("webhooks", () => {
    const secret = "whsec_test_secret";

    function signed(payload: object) {
      const body = JSON.stringify(payload);
      return { payload: body, signature: Stripe.webhooks.generateTestHeaderString({ payload: body, secret }) };
    }

    function event(type: string, sub: Stripe.Subscription) {
      return { id: `evt_${randomUUID()}`, object: "event", type, data: { object: sub } };
    }

    it("rejects requests without a valid Stripe signature", async () => {
      const { payload } = signed(event("customer.subscription.updated", stripeSubscription()));
      await expect(processWebhook(db, { payload, signature: null, secret })).rejects.toThrow(InvalidSignatureError);
      await expect(processWebhook(db, { payload, signature: "t=1,v1=forged", secret })).rejects.toThrow(InvalidSignatureError);
      const tampered = signed(event("customer.subscription.updated", stripeSubscription()));
      await expect(
        processWebhook(db, { payload: tampered.payload.replace("active", "trialing"), signature: tampered.signature, secret }),
      ).rejects.toThrow(InvalidSignatureError);
    });

    it("upgrades the workspace named in the subscription metadata", async () => {
      const request = signed(event("customer.subscription.created", stripeSubscription({ metadata: { organizationId: orgId } })));
      expect(await processWebhook(db, { ...request, secret })).toMatchObject({ handled: true, synced: true, organizationId: orgId });
      expect((await getBilling(db, orgId)).plan).toBe("pro");
    });

    it("falls back to the stored customer when metadata is missing, and downgrades on deletion", async () => {
      await saveCustomer(db, orgId, "cus_123");
      await processWebhook(db, { ...signed(event("customer.subscription.created", stripeSubscription())), secret });
      expect((await getBilling(db, orgId)).plan).toBe("pro");

      await processWebhook(db, { ...signed(event("customer.subscription.deleted", stripeSubscription({ status: "canceled" }))), secret });
      expect((await getBilling(db, orgId)).plan).toBe("free");
    });

    it("acknowledges events it doesn't care about, and subscriptions it can't place", async () => {
      expect(await processWebhook(db, { ...signed({ id: "evt_1", object: "event", type: "invoice.paid", data: { object: {} } }), secret })).toEqual({
        handled: false,
      });
      expect(
        await processWebhook(db, { ...signed(event("customer.subscription.updated", stripeSubscription({ customer: "cus_unknown" }))), secret }),
      ).toMatchObject({ handled: true, synced: false });
    });
  });
});
