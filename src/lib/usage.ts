/**
 * Usage limits + plan gating.
 *
 * Designed to degrade gracefully: if Supabase env vars are absent (local dev),
 * everything is allowed and limits are not enforced. Once you add Supabase keys
 * and the `usage` table, limits kick in automatically.
 *
 * Free plan:  3 scores/day, 1 AI rewrite / month, no export
 * Pro plan:   unlimited
 */

export type Plan = "free" | "pro";
export type Action = "score" | "rewrite" | "export" | "cover-letter";

export const FREE_LIMITS: Record<Action, number> = {
  score: 3, // per day
  rewrite: 1, // per month
  "cover-letter": 0, // Pro only
  export: 0, // Pro only
};

interface CheckResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
}

const supabaseConfigured =
  !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Check whether `userId` may perform `action`. When auth/Supabase is not
 * configured we allow everything so the core tool runs out of the box.
 */
export async function checkAndConsume(
  userId: string | null,
  plan: Plan,
  action: Action
): Promise<CheckResult> {
  if (plan === "pro") return { allowed: true };
  if (!supabaseConfigured || !userId) {
    // Dev / anonymous mode — no enforcement. See README to enable limits.
    return { allowed: true };
  }

  const limit = FREE_LIMITS[action];
  if (limit === 0) {
    return {
      allowed: false,
      reason: `${action} is a Pro feature. Upgrade to unlock it.`,
    };
  }

  const used = await getUsage(userId, action);
  if (used >= limit) {
    return {
      allowed: false,
      reason: `Free plan limit reached (${limit} ${action}${
        action === "score" ? "/day" : "/month"
      }). Upgrade to Pro for unlimited.`,
      remaining: 0,
    };
  }

  await incrementUsage(userId, action);
  return { allowed: true, remaining: limit - used - 1 };
}

// --- Supabase-backed counters (only called when configured) -----------------

async function sb() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Period key used to bucket counters: daily for scores, monthly otherwise. */
function periodKey(action: Action): string {
  const now = new Date();
  if (action === "score") {
    return now.toISOString().slice(0, 10); // YYYY-MM-DD
  }
  return now.toISOString().slice(0, 7); // YYYY-MM
}

async function getUsage(userId: string, action: Action): Promise<number> {
  const client = await sb();
  const { data } = await client
    .from("usage")
    .select("count")
    .eq("user_id", userId)
    .eq("action", action)
    .eq("period", periodKey(action))
    .maybeSingle();
  return data?.count ?? 0;
}

async function incrementUsage(userId: string, action: Action): Promise<void> {
  const client = await sb();
  const period = periodKey(action);
  // Upsert + increment via RPC would be cleaner; simple read-modify-write here.
  const current = await getUsage(userId, action);
  await client
    .from("usage")
    .upsert(
      { user_id: userId, action, period, count: current + 1 },
      { onConflict: "user_id,action,period" }
    );
}
