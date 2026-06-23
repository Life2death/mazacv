import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { updateJobStatus } from "@/lib/jobboard";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getSessionUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    const { id } = await params;
    const body = (await req.json()) as { status?: string };
    if (!body.status) {
      return NextResponse.json({ error: "status is required." }, { status: 400 });
    }

    await updateJobStatus(id, userId, body.status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update job.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
