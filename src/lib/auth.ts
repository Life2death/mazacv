import { Plan } from "./usage";

/**
 * Minimal auth/plan resolution.
 *
 * For the initial launch the tool works anonymously. When you wire Supabase
 * Auth, read the user's session here and look up their plan from the
 * `profiles` table (set to "pro" by your Stripe webhook on successful payment).
 *
 * Until then this returns an anonymous free user, so the app runs out of box.
 */
export interface SessionUser {
  userId: string | null;
  plan: Plan;
}

export async function getSessionUser(req: Request): Promise<SessionUser> {
  const supabaseConfigured =
    !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY;

  if (!supabaseConfigured) {
    return { userId: null, plan: "free" };
  }

  // TODO (Phase 3): verify the Supabase JWT from the Authorization header /
  // cookie, then fetch the plan from `profiles`.
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null, plan: "free" };
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
    if (!userId) return { userId: null, plan: "free" };

    const { data: profile } = await client
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();

    return { userId, plan: (profile?.plan as Plan) ?? "free" };
  } catch {
    return { userId: null, plan: "free" };
  }
}
