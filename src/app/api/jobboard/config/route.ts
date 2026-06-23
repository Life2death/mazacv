import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getConfig, saveConfig, type ScrapeConfig } from "@/lib/jobboard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { userId } = await getSessionUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    const config = await getConfig(userId);
    return NextResponse.json({ config });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch config.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await getSessionUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    const body = (await req.json()) as Partial<ScrapeConfig>;
    const email = req.headers.get("x-user-email") ?? "";

    await saveConfig(userId, email, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save config.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
