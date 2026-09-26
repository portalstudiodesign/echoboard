import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { getBilling } from "@/features/billing/service";
import { getStripe, refreshFromStripe, syncSubscription } from "@/features/billing/stripe";
import { requireMembership } from "@/lib/session";

/**
 * Stripe sends the customer back here from Checkout (?session_id=…) and from the billing
 * portal (?from=portal). Syncing now, instead of waiting for the webhook, means changes show
 * immediately — and work locally, where no webhook can reach us. In production the webhook
 * still arrives and simply rewrites the same snapshot.
 */
export async function GET(request: Request, { params }: RouteContext<"/o/[slug]/billing/return">) {
  const { slug } = await params;
  const { organization } = await requireMembership(slug);
  const search = new URL(request.url).searchParams;
  const stripe = getStripe();

  const sessionId = search.get("session_id");
  if (sessionId) {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
    // Never let one workspace claim another's checkout by swapping the session id in the URL.
    if (session.client_reference_id !== organization.id || !session.subscription || typeof session.subscription === "string") {
      redirect(`/o/${slug}/billing`);
    }
    await syncSubscription(db, session.subscription);
    redirect(`/o/${slug}/billing?upgraded=1`);
  }

  if (search.get("from") === "portal") {
    const { subscription } = await getBilling(db, organization.id);
    if (subscription?.stripeCustomerId) await refreshFromStripe(db, stripe, subscription.stripeCustomerId);
  }
  redirect(`/o/${slug}/billing`);
}
