import { db } from "@/db/client";
import { InvalidSignatureError, processWebhook } from "@/features/billing/stripe";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhooks are not configured." }, { status: 503 });

  try {
    const result = await processWebhook(db, {
      payload: await request.text(),
      signature: request.headers.get("stripe-signature"),
      secret,
    });
    return Response.json({ received: true, ...result });
  } catch (error) {
    if (error instanceof InvalidSignatureError) return Response.json({ error: error.message }, { status: 400 });
    throw error; // 500: Stripe retries the delivery later
  }
}
