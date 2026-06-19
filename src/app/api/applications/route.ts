import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { userId } = await getSessionUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ applications: [] });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data } = await sb
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    return NextResponse.json({ applications: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch applications.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await getSessionUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Not configured." }, { status: 501 });
    }

    const body = (await req.json()) as {
      company: string;
      role: string;
      jd?: string;
      score?: number;
      stage?: string;
      scan_id?: string;
    };

    if (!body.company?.trim() || !body.role?.trim()) {
      return NextResponse.json(
        { error: "Company and role are required." },
        { status: 400 }
      );
    }

    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await sb
      .from("applications")
      .insert({
        user_id: userId,
        company: body.company.trim(),
        role: body.role.trim(),
        jd: body.jd ?? null,
        score: body.score ?? null,
        stage: body.stage ?? "saved",
        scan_id: body.scan_id ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ application: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create application.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
