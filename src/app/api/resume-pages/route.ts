import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import type { JsonResume, TemplateId } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { userId, plan } = await getSessionUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }
    if (plan !== "pro") {
      return NextResponse.json({ error: "Yeh feature sirf Pro users ke liye hai. Upgrade karo!" }, { status: 403 });
    }

    const body = (await req.json()) as {
      scan_id: string;
      parsed_resume: JsonResume;
      template_id: TemplateId;
      accent_color: string;
    };
    if (!body.scan_id || !body.parsed_resume) {
      return NextResponse.json({ error: "scan_id aur parsed_resume required hain." }, { status: 400 });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Not configured." }, { status: 501 });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: existing } = await sb
      .from("resume_pages")
      .select("slug")
      .eq("scan_id", body.scan_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ slug: existing.slug, published: true, alreadyExists: true });
    }

    const slug = crypto.randomUUID();

    const { error } = await sb.from("resume_pages").insert({
      slug,
      scan_id: body.scan_id,
      user_id: userId,
      parsed_resume: body.parsed_resume,
      template_id: body.template_id ?? "classic",
      accent_color: body.accent_color ?? "#4f46e5",
      published: true,
    });

    if (error) throw error;

    return NextResponse.json({ slug, published: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create resume page.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await getSessionUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ pages: [] });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data } = await sb
      .from("resume_pages")
      .select("slug, scan_id, template_id, accent_color, published, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ pages: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch resume pages.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
