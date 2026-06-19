import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

export async function POST(req: Request) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json({ error: "Razorpay not configured." }, { status: 501 });
    }

    const form = await req.formData();
    const razorpayPaymentId = form.get("razorpay_payment_id") as string | null;
    const razorpayOrderId = form.get("razorpay_order_id") as string | null;
    const razorpaySignature = form.get("razorpay_signature") as string | null;

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
    }

    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (!safeCompare(expected, razorpaySignature)) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    // Look up order notes to find user_id
    const keyId = process.env.RAZORPAY_KEY_ID!;
    const Razorpay = (await import("razorpay")).default;
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.fetch(razorpayOrderId);
    const userId = order.notes?.user_id;

    if (userId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Read current credits, add 1 rewrite + 1 export
      const { data: profile } = await sb
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .maybeSingle();
      const current: Record<string, number> = (profile?.credits as Record<string, number>) ?? {};
      const updated = {
        ...current,
        rewrite: (current.rewrite ?? 0) + 1,
        export: (current.export ?? 0) + 1,
      };
      await sb.from("profiles").upsert({ id: userId, credits: updated });
    }

    const origin = process.env.APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(`${origin}/scan?upgraded=1`, 302);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
