import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getLatestRun } from "@/lib/jobboard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { userId } = await getSessionUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    const run = await getLatestRun(userId);
    return NextResponse.json({ run });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch run status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
