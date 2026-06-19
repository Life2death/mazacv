import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

/** Compare two hex strings in constant time to avoid timing attacks. */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

/** Update a user's plan in Supabase. */
async function setPlan(userId: string, plan: "free" | "pro") {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  await sb.from("profiles").upsert({ id: userId, plan });
}

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "Razorpay not configured." }, { status: 501 });
    }

    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";

    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (!safeCompare(expected, signature)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    const event = JSON.parse(body);
    const eventType = event.event;
    const subscription = event.payload.subscription?.entity;
    const payment = event.payload.payment?.entity;
    const userId = subscription?.notes?.user_id ?? payment?.notes?.user_id;
    if (!userId) return NextResponse.json({ received: true });

    if (eventType === "subscription.charged") {
      await setPlan(userId, "pro");
    }

    // Downgrade events — subscription is no longer active
    if (eventType === "subscription.cancelled" ||
        eventType === "subscription.halted" ||
        eventType === "subscription.completed") {
      await setPlan(userId, "free");
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
