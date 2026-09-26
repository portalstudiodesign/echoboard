"use server";

import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { getBilling, saveCustomer } from "@/features/billing/service";
import { ensureProPrice, getStripe } from "@/features/billing/stripe";
import { appUrl } from "@/lib/auth";
import type { FormState } from "@/lib/forms";
import { requireMembership } from "@/lib/session";

/** Only the owner can commit the workspace to paying. */
async function requireOwner(slug: string) {
  const membership = await requireMembership(slug);
  if (membership.role !== "owner") throw new Error("Only the workspace owner can manage billing.");
  return membership;
}

async function stripeCustomerFor(slug: string) {
  const { organization, session } = await requireOwner(slug);
  const stripe = getStripe();
  const { subscription } = await getBilling(db, organization.id);
  if (subscription?.stripeCustomerId) return { stripe, organization, customerId: subscription.stripeCustomerId };

  const customer = await stripe.customers.create(
    { name: organization.name, email: session.user.email, metadata: { organizationId: organization.id } },
    // Double-clicks must not create two customers for one workspace.
    { idempotencyKey: `customer-${organization.id}` },
  );
  await saveCustomer(db, organization.id, customer.id);
  return { stripe, organization, customerId: customer.id };
}

export async function startCheckout(slug: string): Promise<FormState> {
  let url: string | null;
  try {
    const { stripe, organization, customerId } = await stripeCustomerFor(slug);
    if ((await getBilling(db, organization.id)).plan === "pro") return { error: "This workspace is already on Pro." };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: organization.id,
      line_items: [{ price: await ensureProPrice(stripe), quantity: 1 }],
      subscription_data: { metadata: { organizationId: organization.id } },
      allow_promotion_codes: true,
      success_url: `${appUrl}/o/${slug}/billing/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/o/${slug}/billing`,
    });
    url = session.url;
  } catch (error) {
    return { error: (error as Error).message };
  }
  if (!url) return { error: "Stripe didn't return a checkout page." };
  redirect(url);
}

export async function openBillingPortal(slug: string): Promise<FormState> {
  let url: string;
  try {
    const { stripe, customerId } = await stripeCustomerFor(slug);
    const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${appUrl}/o/${slug}/billing/return?from=portal` });
    url = portal.url;
  } catch (error) {
    const message = (error as Error).message;
    if (/configuration/i.test(message)) {
      return { error: "Stripe's customer portal isn't set up yet: save its settings once in Stripe → Settings → Billing → Customer portal." };
    }
    return { error: message };
  }
  redirect(url);
}
