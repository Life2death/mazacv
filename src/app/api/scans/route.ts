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
      return NextResponse.json({ scans: [] });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data } = await sb
      .from("scans")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ scans: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch scans.";
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
      return NextResponse.json({ scan: null });
    }

    const body = (await req.json()) as {
      jd: string;
      resumeText: string;
      score: number;
      subScores?: Record<string, number | null>;
      portal?: string;
    };

    if (!body.jd || !body.resumeText || body.score === undefined) {
      return NextResponse.json(
        { error: "jd, resumeText, and score are required." },
        { status: 400 }
      );
    }

    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await sb
      .from("scans")
      .insert({
        user_id: userId,
        jd: body.jd,
        resume_text: body.resumeText,
        score: body.score,
        sub_scores: body.subScores ?? null,
        portal: body.portal ?? "generic",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ scan: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save scan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
