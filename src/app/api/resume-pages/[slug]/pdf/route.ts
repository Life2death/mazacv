import { NextResponse } from "next/server";
import { renderPdfWithTemplate } from "@/lib/export";
import type { JsonResume, TemplateId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Not configured." }, { status: 501 });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data } = await sb
      .from("resume_pages")
      .select("parsed_resume, template_id, accent_color, published")
      .eq("slug", slug)
      .maybeSingle();

    if (!data || !data.published) {
      return NextResponse.json({ error: "Resume page not found or not published." }, { status: 404 });
    }

    const resume = data.parsed_resume as JsonResume;
    const templateId = (data.template_id as TemplateId) ?? "classic";
    const accentColor = data.accent_color ?? "#4f46e5";

    const buf = await renderPdfWithTemplate(resume, templateId, accentColor);

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="resume-${slug}.pdf"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to render PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
