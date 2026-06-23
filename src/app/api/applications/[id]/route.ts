import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { detectAts } from "@/lib/ats-detection";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { userId } = await getSessionUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Not configured." }, { status: 501 });
    }

    const body = (await req.json()) as {
      company?: string;
      role?: string;
      jd?: string;
      job_url?: string | null;
      score?: number;
      stage?: string;
      scan_id?: string | null;
    };

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.company !== undefined) updates.company = body.company.trim();
    if (body.role !== undefined) updates.role = body.role.trim();
    if (body.jd !== undefined) updates.jd = body.jd;
    if (body.score !== undefined) updates.score = body.score;
    if (body.stage !== undefined) updates.stage = body.stage;
    if (body.scan_id !== undefined) updates.scan_id = body.scan_id;
    if (body.job_url !== undefined) {
      const jobUrl = body.job_url?.trim() || null;
      updates.job_url = jobUrl;
      updates.ats = jobUrl ? detectAts(jobUrl) : null;
    }

    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await sb
      .from("applications")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ application: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update application.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    await sb
      .from("applications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete application.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
