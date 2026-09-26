import Stripe from "stripe";
import type { Db } from "@/db/client";
import { proPrice } from "./plans";
import { applySubscription, findOrganizationByCustomer, type SubscriptionSnapshot } from "./service";

export class BillingNotConfiguredError extends Error {
  constructor() {
    super("Billing isn't set up on this server yet (STRIPE_SECRET_KEY is missing).");
  }
}

export function isBillingConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

let client: Stripe | undefined;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new BillingNotConfiguredError();
  if (/^(sk|rk)_live_/.test(key) && process.env.ALLOW_LIVE_STRIPE !== "true") {
    // A portfolio deployment should never take real money by accident.
    throw new Error("Refusing to use a live Stripe key. Use a test key (sk_test_… or rk_test_…).");
  }
  return (client ??= new Stripe(key));
}

export function snapshotFromStripe(sub: Stripe.Subscription): SubscriptionSnapshot {
  const item = sub.items.data[0];
  const currentPeriodEnd = item ? new Date(item.current_period_end * 1000) : null;
  return {
    customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    subscriptionId: sub.id,
    status: sub.status,
    priceLookupKey: item?.price.lookup_key ?? null,
    // Since API version 2025-03-31 the billing period lives on the subscription item.
    currentPeriodEnd,
    // The billing portal schedules cancellations with `cancel_at` (and leaves
    // `cancel_at_period_end` false); the API flag means the same thing. Accept either.
    cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : sub.cancel_at_period_end ? currentPeriodEnd : null,
  };
}

/** Finds the workspace a subscription belongs to: our own metadata first, then the customer mapping. */
export async function syncSubscription(db: Db, sub: Stripe.Subscription) {
  const snapshot = snapshotFromStripe(sub);
  const organizationId = sub.metadata.organizationId || (await findOrganizationByCustomer(db, snapshot.customerId));
  if (!organizationId) return { synced: false as const, reason: "unknown customer" };
  await applySubscription(db, organizationId, snapshot);
  return { synced: true as const, organizationId };
}

/**
 * Re-reads the workspace's latest subscription straight from Stripe. Used when the customer
 * comes back from the billing portal, so a cancel or card change shows at once instead of
 * whenever the webhook lands.
 */
export async function refreshFromStripe(db: Db, stripe: Stripe, customerId: string) {
  const { data } = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 1 });
  if (!data[0]) return { synced: false as const, reason: "no subscription" };
  return syncSubscription(db, data[0]);
}

const subscriptionEvents = new Set<string>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

/** Applies a verified webhook event. Unrelated event types are acknowledged and ignored. */
export async function handleStripeEvent(db: Db, event: Stripe.Event) {
  if (!subscriptionEvents.has(event.type)) return { handled: false as const };
  const sub = event.data.object as Stripe.Subscription;
  return { handled: true as const, ...(await syncSubscription(db, sub)) };
}

export class InvalidSignatureError extends Error {}

/**
 * Verifies a webhook request really came from Stripe (HMAC over the raw body) and applies it.
 * The raw body must be passed untouched — re-serialised JSON would fail verification.
 */
export async function processWebhook(db: Db, input: { payload: string; signature: string | null; secret: string }) {
  if (!input.signature) throw new InvalidSignatureError("Missing Stripe-Signature header.");
  let event: Stripe.Event;
  try {
    event = await Stripe.webhooks.constructEventAsync(input.payload, input.signature, input.secret);
  } catch (error) {
    throw new InvalidSignatureError((error as Error).message);
  }
  return handleStripeEvent(db, event);
}

/** The Pro price, created on first use so a fresh Stripe test account needs no manual setup. */
export async function ensureProPrice(stripe: Stripe): Promise<string> {
  const existing = await stripe.prices.list({ lookup_keys: [proPrice.lookupKey], active: true, limit: 1 });
  if (existing.data[0]) return existing.data[0].id;
  const created = await stripe.prices.create({
    lookup_key: proPrice.lookupKey,
    transfer_lookup_key: true,
    unit_amount: proPrice.unitAmount,
    currency: proPrice.currency,
    recurring: { interval: proPrice.interval },
    product_data: { name: proPrice.productName },
  });
  return created.id;
}
