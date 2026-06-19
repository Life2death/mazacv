import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
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
      .from("scans")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ error: "Scan not found." }, { status: 404 });
    }

    return NextResponse.json({ scan: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch scan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await getSessionUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Not configured." }, { status: 501 });
    }

    const body = (await req.json()) as {
      rewritten_text?: string;
    };

    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await sb
      .from("scans")
      .update({
        rewritten_text: body.rewritten_text ?? null,
      })
      .eq("id", params.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ scan: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update scan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
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
      .from("scans")
      .delete()
      .eq("id", params.id)
      .eq("user_id", userId);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete scan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
