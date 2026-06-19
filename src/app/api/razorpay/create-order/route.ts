import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const AMOUNT_PAISE = 4900; // ₹49

export async function POST(req: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
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

    const Razorpay = (await import("razorpay")).default;
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await rzp.orders.create({
      amount: AMOUNT_PAISE,
      currency: "INR",
      receipt: `ekbaa_${userId.slice(0, 12)}_${Date.now()}`,
      notes: { user_id: userId, type: "oneshot" },
    });

    return NextResponse.json({
      order_id: order.id,
      key_id: keyId,
      amount: AMOUNT_PAISE,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create order.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
