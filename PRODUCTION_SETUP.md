# MazaCV — Production Setup & Config Runbook

> Consolidated from a live deployment session (mazacv.in on Vercel + a dedicated
> Supabase project + Razorpay live). Two parts:
> - **Part 1 — CODE FIXES** the agent must apply in this repo (real bugs found live).
> - **Part 2 — DASHBOARD CONFIG** the owner applies in Vercel / Supabase / Razorpay
>   / Google / Resend (not code — settings).
>
> Status legend: ✅ done · 🔧 agent to fix · ⚙️ owner to configure

---

## PART 1 — CODE FIXES (agent, in this repo)

### 🔧 1. Supabase `handle_new_user` trigger — `search_path` bug (CRITICAL)
**Symptom seen live:** magic-link signup returned `500 {"code":"unexpected_failure",
"message":"Database error saving new user"}`; Postgres log showed
`relation "profiles" does not exist`.
**Cause:** the `SECURITY DEFINER` trigger function had no `search_path` and used an
unqualified table name, so it couldn't resolve `profiles` at signup time → the
whole `auth.users` insert rolled back.
**Fix in `supabase-schema.sql`** (replace the function definition):
```sql
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public          -- REQUIRED
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;  -- schema-qualified
  return new;
end;
$$;
```
(Already hot-fixed in the live DB; this makes the repo correct for future deploys.)

### 🔧 2. Google OAuth flow determinism
In `src/lib/supabase-client.ts`, set the auth flow explicitly so the `?code=`
callback (`/auth/callback`) matches:
```ts
auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" }
```

### 🔧 3. Login page — surface real status (don't render `{}`)
`src/app/login/page.tsx` currently dumps the raw result object (showed `{}`
live, hiding success/failure). Show:
- success → "Magic link bhej diya — inbox check kar 📨"
- error → the actual error message string
Also pass `emailRedirectTo` so users land on the app, not the bare Site URL root:
```ts
await supabaseClient.auth.signInWithOtp({
  email,
  options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/scan` },
});
```

### 🔧 4. Razorpay `total_count` — verify, don't assume
`create-subscription` uses `total_count: 0` for "infinite recurring." Razorpay's
API minimum is typically **1**; `0` may be rejected and break checkout. **Run a
real test-mode subscription create** — if it errors, use a large finite number
(e.g. `120` monthly). Confirm before relying on live billing.

### 🔧 5. SMTP / email — make it a launch blocker (see Part 2 §E)
No code change beyond what's above, but the app's login depends on email
delivery, which the built-in Supabase email cannot carry. Treat custom SMTP as
**required for launch**, not optional.

### 🔧 6. (Lower priority, from earlier reviews)
- Idempotency guard: only skip-grant on the unique-violation error code, not any
  insert error (avoid fail-closed on transient DB errors).
- Substring matching false positives on short skill tokens (`"erp"` in
  "enterprise", `"uat"` in "evaluate") — word-boundary match for <4-char tokens.
- CGPA `%` regex too broad — require education context nearby.
- Privacy / "delete all my data" path — resumes are now persisted in `scans`.

---

## PART 2 — DASHBOARD CONFIG (owner)

### ⚙️ A. Vercel — Environment Variables
Set ALL of these (Production). `NEXT_PUBLIC_*` are **inlined at build time** — after
adding/changing them you MUST trigger a **clean rebuild** (Redeploy with "Use
existing Build Cache" UNCHECKED), or they won't take effect.

| Var | Notes |
|---|---|
| `ANTHROPIC_API_KEY` | Claude (AI rewrite/cover letter) |
| `APP_URL` | `https://www.mazacv.in` |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | server-side |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **same values**, client-side; need clean rebuild |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | server |
| `RAZORPAY_MONTHLY_PLAN_ID` / `RAZORPAY_YEARLY_PLAN_ID` | from Razorpay dashboard |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | client; clean rebuild |

**Gotcha learned:** a *new* Supabase project has **all-new** URL + anon + service
keys — they are NOT shared with any other project. Update all five Supabase vars,
not just the URL.

### ⚙️ B. Supabase — project & schema
- **Use a DEDICATED Supabase project for MazaCV** — NOT the job-hunter project
  (their `profiles` tables collide). ✅ done.
- Run the full `supabase-schema.sql` in the SQL editor; confirm 6 tables exist:
  `profiles, usage, scans, applications, processed_payments, resume_pages`. ✅
- Apply the trigger fix from Part 1 §1.

### ⚙️ C. Supabase — Auth URL configuration (this caused the localhost / "invalid path" errors)
**Authentication → URL Configuration:**
- **Site URL** → `https://www.mazacv.in`  — MUST include `https://`, and match the
  served host (`www`). Setting it without the scheme produced
  `…supabase.co/www.mazacv.in → "requested path is invalid"`.
- **Redirect URLs** → `https://www.mazacv.in/**` and `https://www.mazacv.in/auth/callback`
- Decide canonical host: standardize on `www.mazacv.in` (current) OR set Vercel to
  redirect www→non-www and use `https://mazacv.in` everywhere. Be consistent across
  Site URL, `APP_URL`, and redirect URLs.

### ⚙️ D. Supabase — Auth providers
- **Email** provider enabled + "Allow new users to sign up" ON (magic link).
- **Google** (optional): create OAuth client in **Google Cloud Console**, set its
  Authorized redirect URI to `https://<project-ref>.supabase.co/auth/v1/callback`,
  then enable Google in Supabase → Providers and paste Client ID/Secret.
  (Without this you get `provider is not enabled`.)

### ⚙️ E. Email / SMTP — REQUIRED FOR LAUNCH
**Symptom seen live:** `email rate limit exceeded` after a few magic links.
Supabase's built-in email is testing-only (~3–4/hour, per project) and cannot
serve real users. Configure custom SMTP:
- **Resend** (free tier) or SendGrid: verify a sending domain (e.g. mail.mazacv.in),
  get SMTP creds, set them in **Supabase → Project Settings → Authentication → SMTP**.
- Set a proper "from" address (e.g. `no-reply@mazacv.in`) and sender name "MazaCV".
- This removes the rate limit and makes magic-link / future notification email
  reliable. **Do not launch on built-in email.**

### ⚙️ F. Razorpay
- Live keys in Vercel; create the Monthly + Yearly **Plans**, put their IDs in env.
- **Webhook**: point a Razorpay webhook at `https://www.mazacv.in/api/razorpay/webhook`,
  subscribe to `subscription.charged`, `subscription.cancelled`, `subscription.halted`,
  `subscription.completed`, `payment.captured`; set the signing secret as
  `RAZORPAY_WEBHOOK_SECRET`.
- Verify the `total_count` behavior (Part 1 §4) with a test subscription first.

---

## PART 3 — POST-DEPLOY VERIFICATION CHECKLIST
Run after config + the clean rebuild:
1. mazacv.in/login → magic link → lands on `https://www.mazacv.in/...` logged in
   (NavBar shows email + Logout). [auth]
2. Run **4 scores** while logged in → 4th returns the upgrade modal. [limits]
3. Buy **Pro** in Razorpay test mode → plan flips to `pro`; unlimited works. [sub]
4. Buy **₹49 Ek Baar** test → exactly **1** rewrite + **1** export granted (not 2).
   [idempotency]
5. Cancel the subscription → webhook sets plan back to `free`. [downgrade]
6. Dashboard shows saved scans; another account cannot see them. [RLS/ownership]
7. Export a resume in PDF + Word with a chosen template; cover letter exports too.
8. Google login (if enabled) round-trips to the app logged in.

---

## Quick reference — the 5 gotchas this session surfaced
1. New Supabase project = all-new keys (not just URL).
2. `NEXT_PUBLIC_*` vars inline at build → need a cache-free rebuild.
3. `SECURITY DEFINER` trigger needs `set search_path = public` + schema-qualified table.
4. Auth **Site URL** must include `https://` and match the served host (`www`).
5. Built-in Supabase email is rate-limited — custom SMTP is a launch requirement.
