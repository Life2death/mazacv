import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!webhookSecret || !keySecret) {
      return NextResponse.json({ error: "Razorpay not configured." }, { status: 501 });
    }

    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";

    // Verify webhook signature
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    const event = JSON.parse(body);
    const eventType = event.event;

    // Handle subscription charged events
    if (eventType === "subscription.charged") {
      const subscription = event.payload.subscription?.entity;
      const payment = event.payload.payment?.entity;
      const userId = subscription?.notes?.user_id ?? payment?.notes?.user_id;

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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
