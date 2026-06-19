# MazaCV — Daily Build Roadmap (one feature per day)

> **For the implementing agent.** Each "Day" below is a self-contained, shippable
> unit of work. Do exactly one per day, in order. Each ends with `npm run build`
> passing and a manual smoke test. Don't start the next day's work until the
> current day is verified and committed.
>
> **Read first:** `README.md` (what exists), `BUILD_PLAN.md` (phases + decisions),
> `DESIGN_BRIEF.md` (branding + Hinglish copy + screen specs), and the design
> mockups handed over in `/design-handoff` (see "Design handover" at the bottom).
>
> **Global guardrails (apply every day):**
> - Free scoring must keep working with ZERO config (no keys). Gated features
>   degrade gracefully when Supabase/Razorpay/Anthropic keys are absent.
> - Slang (Hinglish) lives only in UI chrome — NEVER in the downloadable resume.
> - Verify `npm run build` after every day. Commit with a clear message + push.
> - INR + Razorpay is the India payment path. Stripe stays optional.
> - Match the design mockups for any UI work.

---

## DAY 0 — LAUNCH (today) — ship what already works
**Goal:** get the current working app live on a public URL today.
- Push repo (done: github.com/Life2death/mazacv).
- Deploy to Vercel; set `ANTHROPIC_API_KEY` + `APP_URL` env vars.
- Smoke test live: upload resume → paste JD → score → AI rewrite → PDF + Word.
- Share the URL. (No auth/billing yet — runs free + open. That's fine for a beta.)
**Acceptance:** anyone with the URL can score a resume and download a tailored one.

---

## DAY 1 — Score sub-categories
**Goal:** break the single score into Hard Skills · Soft Skills · Searchability · Format Health (matches GoodSpace's depth).
- Extend `src/lib/score.ts`: classify JD keywords into hard vs soft skills (maintain a soft-skills lexicon: communication, leadership, teamwork, etc.); compute coverage per bucket.
- "Searchability" = section headers present + contact info parseable + file parsed cleanly.
- "Format Health" = reuse existing `formatWarnings` as a 0–100 sub-score.
- Update `ScoreResult` type + `/api/score` response + UI to show 4 sub-bars under the main gauge.
**Acceptance:** results show 4 labelled sub-scores; main score unchanged in logic.

---

## DAY 2 — Naukri / India-tuned scoring
**Goal:** close ResumeVera's core advantage — tune for Indian JDs.
- Add an Indian-context keyword/skills dictionary (Naukri/IT-services common terms, tech stacks, certifications common in India).
- Recognise CGPA / percentage / "B.E./B.Tech/MCA" patterns as valid education signals in `formatWarnings`.
- Add an optional "Target portal" selector (Naukri / LinkedIn India / Generic) that lightly adjusts weighting + tips copy.
**Acceptance:** an Indian-format resume + Naukri JD scores sensibly; CGPA no longer triggers a false "no education" warning.

---

## DAY 3 — Cover letter generator
**Goal:** a feature NO Indian competitor has.
- New `src/lib/coverletter.ts` (Claude, no fabrication, professional English).
- New `/api/cover-letter` route (gated like rewrite — Pro/one-shot).
- UI: "Cover letter bhi bana do ✉️" button on the result screen → preview + copy + export (reuse `toDocx`/`toPdf`).
**Acceptance:** generates a tailored, truthful cover letter; exportable; gated.

---

## DAY 4 — Resume templates (moved up so it's testable now) ⭐
**Goal:** replace the boring plain-text export with a library of designed,
1–2 page, ATS-safe resume templates the user can pick from.

> NOTE: the original "apply design system (fonts/tokens/components)" work is
> already DONE (committed in "Apply MazaCV design system to scorer page"), so
> Day 4 is now the templates feature.

**Approach — `@react-pdf/renderer` (DECIDED: no Puppeteer/Chromium).**
Rationale: Puppeteer needs a Chromium binary (50MB+ layer, cold starts) on
Vercel — dropped. Raw `pdf-lib` = manual coordinate math, too painful for many
templates. `@react-pdf/renderer` is the middle path: declarative React
components → PDF, pure JS (deploys clean on Vercel, no binary), supports
columns/fonts/colours/images. Each template is just a React component.

1. **Data model:** structure the resume into the **JSON Resume schema**
   (jsonresume.org) — one standard shape, future-proof. Parse the user's
   uploaded/AI-tailored resume text into this JSON (Claude can do the parse).
2. **Rendering:** build templates as **`@react-pdf/renderer` components** fed by
   the JSON Resume data. Replace the plain-text `pdf-lib` resume export with
   this. Keep DOCX export via the `docx` lib (map JSON → docx).
   - NOTE: react-pdf does NOT render arbitrary HTML themes, so we hand-build our
     own template components (we don't pull community `jsonresume-theme-*` HTML).
     That's the accepted trade-off — ship a few good ones now, scale later.
3. **Bundle 6–8 templates** in two clearly-labelled tiers:
   - **ATS-Safe (default):** single-column only — NO sidebars, tables, or
     text-boxes (they break ATS parsers). Variety comes from typography, accent
     colour, and section dividers. ~4 of these.
   - **Designer:** two-column / richer layouts for when a human reads it or for
     LinkedIn. ~2–4 of these. Label them "may not be fully ATS-safe."
4. **Enforce 1–2 pages:** cap content / size the react-pdf `<Page size="A4">`,
   and warn if content overflows 2 pages ("Resume 2 page se bada hai — trim kar").
5. **Per-template accent-colour picker** → lots of perceived variety from few
   base layouts.
6. **UI:** a template gallery on the result/export step (thumbnail previews);
   selecting one re-renders the preview; export uses the chosen template.

**Acceptance:** user can pick from ≥6 templates; each exports a clean 1–2 page
PDF (and DOCX); ATS-Safe templates are single-column and parse cleanly; build
passes; gating unchanged (export stays Pro/one-shot). No slang in the resume
output itself.
**Guardrails:** no Chromium/Puppeteer. Verify export works on a live Vercel
deploy (react-pdf in a serverless route), not just locally, before done.

---

## DAY 5 — Landing / Hero page
**Goal:** real marketing front door (Screen 1 in the brief).
- New `/` landing: nav, Hinglish hero + CTA, trust strip, 3-step explainer, sample score card, footer.
- Move the scorer workflow to `/scan`.
**Acceptance:** landing matches mockup; "Score nikaal — free!" routes to `/scan`; mobile clean at 360px.

---

## DAY 6 — Supabase auth + login screen
**Goal:** users can sign in (Screen 5).
- Create Supabase project; run `supabase-schema.sql`.
- `/login`: email magic-link + Google OAuth, warm Hinglish copy.
- Attach JWT to API calls; finish `src/lib/auth.ts` TODO (verify JWT, read `profiles.plan`).
**Acceptance:** anonymous users still get free scoring; signed-in users resolve a plan.

---

## DAY 7 — Usage limits + indicators
**Goal:** enforce free-tier limits for real (Screen 2 nudges).
- Confirm `src/lib/usage.ts` enforces with Supabase set (3 scores/day, 1 rewrite/month, export = Pro/one-shot).
- UI usage indicator ("2 free scores left aaj ke liye") + the `UpgradeModal` ("Free limit khatam, bhidu!").
**Acceptance:** free user hits limits and sees the upgrade modal; Pro unlimited.

---

## DAY 8 — Razorpay: Pro subscription
**Goal:** take recurring money (India path).
- `/api/razorpay/order` + `/api/razorpay/webhook` (verify signature → set `profiles.plan = pro`).
- Razorpay Subscriptions for ₹199/mo + ₹999/yr.
- Wire into `/pricing` (Screen 4) + `UpgradeModal`.
**Acceptance:** test-mode subscription flips plan; webhook idempotent + signature-verified.

---

## DAY 9 — Razorpay: ₹49 one-shot ("Ek Baar")
**Goal:** capture price-sensitive majority.
- Add a `credits`/`entitlements` concept (1 tailor + 1 export per purchase).
- Single Razorpay order for ₹49 → grants credits; `usage.ts` honours credits before limits.
**Acceptance:** ₹49 purchase grants exactly 1 tailor + 1 export; consumed correctly.

---

## DAY 10 — Pricing page polish + payment trust
**Goal:** finalise Screen 4.
- 3 plan cards (Bindaas / Ek Baar / Jhakaas), annual toggle, UPI + Razorpay + RuPay logos, "Cancel kabhi bhi. No tension."
**Acceptance:** matches mockup; both purchase paths reachable from here.

---

## DAY 11 — Dashboard / scan history (Pro)
**Goal:** stickiness via saved work (Screen 6).
- `scans` table (user_id, jd, resume_text, score, rewritten_text, created_at) with RLS.
- Save a record on each score/rewrite for signed-in users; `/dashboard` lists them; re-open / re-score / re-download.
**Acceptance:** history persists per user; only owner reads their scans.

---

## DAY 12 — Job Tracker (Kanban) — the moat
**Goal:** the feature no Indian competitor has.
- `applications` table (user_id, company, role, jd, score, stage, created_at).
- `/tracker` Kanban: Saved → Applied → Interview → Offer → Rejected; drag between columns; attach a scan; show score per card.
**Acceptance:** create/move/delete applications; persists; mobile-usable.

---

## DAY 13 — ATS-safe resume templates → MOVED TO DAY 4
This feature was prioritised and moved up to **Day 4** (see above). This slot is
now free — pull the next backlog item forward, or use it to add more themes /
template polish on top of the Day 4 foundation (e.g. Fresher, Technical,
Career-Switcher variants if not already covered).

---

## DAY 14 — Impact score (human-reader)
**Goal:** match GoodSpace's unique second score.
- `src/lib/score.ts`: score quantified achievements (numbers/%/metrics), action verbs, weak/passive phrasing, clichés.
- Show as a second gauge beside the ATS score.
**Acceptance:** resumes with metrics + strong verbs score higher; clichés flagged.

---

## DAY 15 — Public resume link ("share my resume")
**Goal:** Rezup-style viral growth lever (Pro).
- Optional public page `/r/[slug]` rendering a chosen resume; toggle on/off in dashboard.
**Acceptance:** Pro user can publish + unpublish a shareable resume link.

---

## DAY 16 — Hardening + cost control + analytics
**Goal:** safe + measurable before scaling.
- Rate-limit `/api/score` + `/api/rewrite` (per-IP anon, per-user signed-in).
- LLM cost caps: truncate oversized inputs; consider Haiku for one-shot vs Opus for Pro.
- Privacy note + delete-my-data; file size/type validation.
- Add analytics (PostHog/Plausible); track free→one-shot→Pro funnel.
**Acceptance:** no obvious abuse vector; costs bounded; funnel events firing.

---

## DAY 17 — LinkedIn optimizer
**Goal:** another gap no Indian competitor fills.
- User pastes LinkedIn "About + Experience" text; reuse scoring + Claude suggestions for headline/summary/skills.
**Acceptance:** returns actionable LinkedIn suggestions against a target role.

---

## BACKLOG (v2, not daily)
- Chrome extension (save jobs from Naukri/LinkedIn into tracker)
- ATS detection (which ATS a company uses)
- Interview prep module
- Built-in job board

---

## Design handover — where the agent finds the mockups
Place the Claude-design output in a top-level `/design-handoff` folder in this
repo (see the chat for how to export it). Acceptable forms, in order of usefulness:
1. **Exported HTML/CSS or React components** → agent adapts them directly.
2. **A spec doc / style tile (Markdown or PDF)** → agent reads tokens + layout.
3. **Screenshots (PNG) per screen + state** → agent matches them visually.
The agent should treat `DESIGN_BRIEF.md` as the source of truth for copy/colour
and the handoff files as the source of truth for layout/visual detail.
