import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const monthlyPlan = process.env.RAZORPAY_MONTHLY_PLAN_ID;
    const yearlyPlan = process.env.RAZORPAY_YEARLY_PLAN_ID;

    if (!keyId || !keySecret || !monthlyPlan || !yearlyPlan) {
      return NextResponse.json(
        { error: "Razorpay is not configured yet." },
        { status: 501 }
      );
    }

    const { userId } = await getSessionUser(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Please log in first." },
        { status: 401 }
      );
    }

    const { plan } = (await req.json()) as { plan?: "monthly" | "yearly" };
    const planId = plan === "yearly" ? yearlyPlan : monthlyPlan;
    const totalCount = plan === "yearly" ? 12 : 1;

    const Razorpay = (await import("razorpay")).default;
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const subscription = await rzp.subscriptions.create({
      plan_id: planId,
      total_count: totalCount,
      customer_notify: 1,
      notes: { user_id: userId },
    });

    // Amount in paise: ₹19900 or ₹99900
    const amountPaise = plan === "yearly" ? 99900 : 19900;
    return NextResponse.json({
      subscription_id: subscription.id,
      key_id: keyId,
      amount: amountPaise,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create subscription.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
