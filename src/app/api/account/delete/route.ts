import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { userId } = await getSessionUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Not configured." }, { status: 501 });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const tables = ["applications", "scans", "usage", "resume_pages", "processed_payments", "profiles"];
    for (const table of tables) {
      await sb.from(table).delete().eq("user_id", userId);
    }

    const { error: adminError } = await sb.auth.admin.deleteUser(userId);
    if (adminError) {
      console.warn("[Delete Account] Failed to delete auth user:", adminError.message);
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
