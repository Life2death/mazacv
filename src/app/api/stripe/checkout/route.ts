import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Creates a Stripe Checkout session for the Pro plan.
 * Requires STRIPE_SECRET_KEY and STRIPE_PRICE_ID env vars.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!secret || !priceId) {
    return NextResponse.json(
      { error: "Billing is not configured yet (set STRIPE_SECRET_KEY / STRIPE_PRICE_ID)." },
      { status: 501 }
    );
  }

  const { userId } = await getSessionUser(req);
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(secret);

  const origin = req.headers.get("origin") ?? process.env.APP_URL ?? "";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: userId ?? undefined,
    success_url: `${origin}/?upgraded=1`,
    cancel_url: `${origin}/?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
