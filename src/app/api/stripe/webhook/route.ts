import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Stripe webhook: on successful checkout, mark the user's profile plan = "pro".
 * Requires STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and Supabase service role.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    return NextResponse.json({ error: "Billing not configured." }, { status: 501 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(secret);
  const sig = req.headers.get("stripe-signature") ?? "";
  const body = await req.text();

  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "bad signature";
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as import("stripe").Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    if (userId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      await sb.from("profiles").upsert({ id: userId, plan: "pro" });
    }
  }

  return NextResponse.json({ received: true });
}
