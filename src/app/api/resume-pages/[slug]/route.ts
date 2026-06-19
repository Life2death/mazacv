import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
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

    const { data } = await sb
      .from("resume_pages")
      .select("*")
      .eq("slug", params.slug)
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ error: "Resume page not found." }, { status: 404 });
    }

    return NextResponse.json({ page: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch resume page.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { userId } = await getSessionUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    const body = (await req.json()) as {
      published?: boolean;
    };

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Not configured." }, { status: 501 });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const updates: Record<string, unknown> = {};
    if (body.published !== undefined) updates.published = body.published;

    const { data, error } = await sb
      .from("resume_pages")
      .update(updates)
      .eq("slug", params.slug)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Resume page not found." }, { status: 404 });
    }

    return NextResponse.json({ page: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update resume page.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { slug: string } }
) {
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
      .from("resume_pages")
      .delete()
      .eq("slug", params.slug)
      .eq("user_id", userId);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete resume page.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
