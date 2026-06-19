import { Plan } from "./usage";
import type { Credits } from "./types";

export interface SessionUser {
  userId: string | null;
  plan: Plan;
  credits: Credits;
}

export async function getSessionUser(req: Request): Promise<SessionUser> {
  const supabaseConfigured =
    !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY;

  if (!supabaseConfigured) {
    return { userId: null, plan: "free", credits: {} };
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null, plan: "free", credits: {} };
  }

  try {
    const token = authHeader.slice(7);
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    const { data } = await client.auth.getUser(token);
    const userId = data.user?.id ?? null;
    if (!userId) return { userId: null, plan: "free", credits: {} };

    const { data: profile } = await client
      .from("profiles")
      .select("plan, credits")
      .eq("id", userId)
      .maybeSingle();

    return {
      userId,
      plan: (profile?.plan as Plan) ?? "free",
      credits: (profile?.credits as Credits) ?? {},
    };
  } catch {
    return { userId: null, plan: "free", credits: {} };
  }
}
