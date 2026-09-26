import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { getStripe, syncSubscription } from "@/features/billing/stripe";
import { requireMembership } from "@/lib/session";

/**
 * Stripe Checkout sends the customer back here. Syncing now (instead of waiting for the
 * webhook) means the upgrade shows immediately — and works locally where no webhook can reach us.
 * The webhook still runs in production and simply rewrites the same snapshot.
 */
export async function GET(request: Request, { params }: RouteContext<"/o/[slug]/billing/return">) {
  const { slug } = await params;
  const { organization } = await requireMembership(slug);
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) redirect(`/o/${slug}/billing`);

  const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
  // Never let one workspace claim another's checkout by swapping the session id in the URL.
  if (session.client_reference_id !== organization.id || !session.subscription || typeof session.subscription === "string") {
    redirect(`/o/${slug}/billing`);
  }
  await syncSubscription(db, session.subscription);
  redirect(`/o/${slug}/billing?upgraded=1`);
}
