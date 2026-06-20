interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000;
const ANON_LIMIT = 30;
const USER_LIMIT = 60;

const supabaseConfigured =
  !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * In-memory limiter. Per-instance only — used as a fallback in local dev when
 * Supabase isn't configured. On serverless this does NOT enforce a global limit.
 */
function checkRateLimitInMemory(
  ip: string,
  userId?: string | null
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const key = userId ? `user:${userId}` : `ip:${ip}`;
  const limit = userId ? USER_LIMIT : ANON_LIMIT;

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count };
}

/**
 * Shared, persistent rate limiter backed by Postgres (atomic check_rate_limit
 * RPC). Enforces a global limit across all serverless instances. Falls back to
 * the in-memory limiter if Supabase isn't configured or the RPC errors (fail-open
 * is intentional here — we never want the limiter to take down scoring).
 */
export async function checkRateLimit(
  ip: string,
  userId?: string | null
): Promise<{ allowed: boolean; remaining: number }> {
  if (!supabaseConfigured) {
    return checkRateLimitInMemory(ip, userId);
  }

  const key = userId ? `user:${userId}` : `ip:${ip}`;
  const limit = userId ? USER_LIMIT : ANON_LIMIT;

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await sb.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_ms: WINDOW_MS,
    });
    if (error) return checkRateLimitInMemory(ip, userId);
    return { allowed: data === true, remaining: data === true ? 1 : 0 };
  } catch {
    return checkRateLimitInMemory(ip, userId);
  }
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 300_000);
}
