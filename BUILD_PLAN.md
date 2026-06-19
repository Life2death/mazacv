# ResumeLelo — Build Plan (for the implementing agent)

> **Purpose:** This is the execution plan to take ResumeLelo from its current
> working core to a launch-ready freemium product for the Indian market.
> The agent picking this up should work phase by phase, in order, and verify
> each phase (build passes + manual smoke test) before moving on.
>
> **Current state (already done — do NOT rebuild):**
> - Next.js 14 app, `npm run build` passes.
> - Free scoring (`src/lib/score.ts`), Claude rewrite (`src/lib/rewrite.ts`),
>   PDF/Word export (`src/lib/export.ts`).
> - API routes: `/api/score`, `/api/rewrite`, `/api/export`, `/api/stripe/*`.
> - Usage limits + auth scaffolding (env-gated, graceful when unconfigured).
> - Single-page UI in `src/app/page.tsx`.
> - `DESIGN_BRIEF.md` (branding + Mumbai microcopy + screen specs).
>
> **What's NOT done:** real auth UI, Razorpay (India payments), pricing page,
> dashboard/history, applying the visual design, analytics, deployment.

---

## Product decisions (locked)

- **Brand:** ResumeLelo (LiftLelo / NaukriLelo family). See `DESIGN_BRIEF.md`.
- **Pricing (INR):**
  - Free "Bindaas" — ₹0, unlimited scoring + tips.
  - One-shot "Ek Baar" — **₹49 one-time** = 1 AI tailor + 1 export.
  - Pro "Jhakaas" — **₹199/mo or ₹999/yr** = unlimited tailor + export + history.
- **Payments:** **Razorpay** (UPI-first) is primary for India. Keep the existing
  Stripe code as an optional international fallback, but Razorpay is the launch path.
- **Voice:** Hinglish in UI chrome; professional English in resume output.

---

## Phase 5 — Apply the visual design + Mumbai voice
**Goal:** turn the functional single page into the branded, multi-screen UX from
`DESIGN_BRIEF.md`.

Tasks:
1. Set up the design system: Tailwind theme tokens for the palette in the brief
   (indigo primary, amber/saffron accent, success/warn/danger), Poppins + Inter
   fonts via `next/font`.
2. Build shared components: `ScoreGauge`, `KeywordChip`, `Button`, `Card`,
   `UpgradeModal`, `Loader` (with Hinglish loading text), `Toast`.
3. Restructure routing into real screens:
   - `/` Landing/Hero
   - `/scan` the Scorer workflow (move current `page.tsx` logic here)
   - `/result` AI-tailored result (or a section within `/scan`)
   - `/pricing`
   - `/login`
   - `/dashboard` (Pro)
4. Apply all Hinglish microcopy from `DESIGN_BRIEF.md` §4.
5. Mobile-first: verify every screen at 360–390px; tap targets ≥48px.

Acceptance: matches the design mockups (once produced by Claude design), build
passes, mobile layout clean, no slang leaks into downloadable resume.

---

## Phase 6 — Auth (Supabase) + real plan gating
**Goal:** users can sign in; plan is read from Supabase; limits enforce for real.

Tasks:
1. Create Supabase project; run `supabase-schema.sql` (profiles + usage + trigger).
2. Add Supabase Auth UI on `/login`: email magic-link + Google OAuth.
   Warm copy from brief ("Wapas aa gaya, boss! 👋").
3. Wire the client to attach the Supabase JWT to API calls (Authorization header).
4. Finish `src/lib/auth.ts` TODO: verify JWT, fetch `profiles.plan`.
5. Confirm `src/lib/usage.ts` limits enforce once Supabase env is set
   (3 scores/day, 1 rewrite/month free; export = Pro/one-shot only).
6. Add a usage indicator in the UI ("2 free scores left aaj ke liye").

Acceptance: anonymous users still get free scoring; signed-in free users hit
limits; Pro users are unlimited.

---

## Phase 7 — Razorpay payments (India) + plan upgrades
**Goal:** users can pay via UPI/cards and get upgraded automatically.

Tasks:
1. Add Razorpay: `/api/razorpay/order` (create order) and
   `/api/razorpay/webhook` (verify signature → set `profiles.plan`/entitlement).
2. Implement BOTH products:
   - **Pro subscription** (₹199/mo, ₹999/yr) via Razorpay Subscriptions.
   - **One-shot ₹49** via a single Razorpay order that grants 1 tailor + 1 export
     (add a `credits` concept to `usage`/`profiles`, or an `entitlements` table).
3. Razorpay Checkout on `/pricing` and inside `UpgradeModal`.
4. Update `src/lib/usage.ts` to honor one-shot credits before falling back to limits.
5. Keep Stripe routes as optional international fallback (env-gated).

Acceptance: test-mode payment flips plan/credits; webhook idempotent; signature
verified; failed/cancelled payments handled gracefully with Hinglish errors.

---

## Phase 8 — Dashboard / history (Pro value)
**Goal:** Pro users can see and reuse past scans.

Tasks:
1. Add a `scans` table (user_id, jd, resume_text, score, created_at, rewritten_text).
2. Save a scan record on each score/rewrite for signed-in users.
3. Build `/dashboard`: list past scans with score + date; re-open, re-score,
   re-download. Friendly empty state from brief.

Acceptance: history persists per user; only the owner can read their scans (RLS).

---

## Phase 9 — Hardening + trust + analytics
**Goal:** safe to put in front of real users.

Tasks:
1. **Rate limiting / abuse protection** on `/api/score` and `/api/rewrite`
   (per-IP for anon, per-user for signed-in) — protect LLM cost.
2. **LLM cost control:** cap input tokens, truncate huge JD/resume, consider a
   cheaper model (Haiku) for the one-shot tier vs Opus for Pro.
3. **Privacy:** add a privacy note ("your data stays private, not sold");
   decide retention for uploaded resumes; add delete-my-data.
4. **Validation:** file size/type limits on upload; friendly errors.
5. **Analytics:** add a lightweight analytics (e.g. Plausible/PostHog) — track
   scores, conversions free→one-shot→Pro.
6. **SEO/meta:** OG tags, India-targeted landing copy, sitemap.

Acceptance: no obvious abuse vector; costs bounded; privacy stated; basic
funnel analytics live.

---

## Phase 10 — Deploy + launch
**Goal:** live on a domain.

Tasks:
1. Push repo (done: github.com/Life2death/resume-lelo). Import to **Vercel**.
2. Set env vars in Vercel: `ANTHROPIC_API_KEY`, Supabase keys, Razorpay keys,
   `APP_URL`.
3. Point domain (e.g. resumelelo.com / .in). Configure Razorpay webhook URL.
4. Smoke test the full funnel in production: score → upgrade (test) → tailor →
   export → history.
5. Soft launch to a small group; watch analytics + LLM cost.

Acceptance: end-to-end works on the live domain; payments in live mode verified
with a real ₹1 test where possible.

---

## Suggested task order for the agent
1. Phase 5 (design) — but **wait for Claude design mockups** before finalizing UI.
2. Phase 6 (auth) — can run in parallel with 5.
3. Phase 7 (Razorpay) — depends on 6.
4. Phase 8 (dashboard) — depends on 6.
5. Phase 9 (hardening) — before launch.
6. Phase 10 (deploy).

## Guardrails for the agent
- Don't break the "works with zero config" property: scoring must keep running
  without any keys; gated features degrade gracefully.
- Keep slang OUT of the downloadable resume.
- Verify `npm run build` after every phase.
- Use INR + Razorpay for the India path; Stripe stays optional.
- Reference `DESIGN_BRIEF.md` for all copy and visuals.
