# MazaCV — Free ATS Resume Scorer + AI Tailoring

ATS resume scorer with AI tailoring, built for the Indian market.  
**Hinglish in the UI. Professional English in the output. Freemium billing in ₹.**

→ **Live at:** [mazacv.in](https://mazacv.in)

## What it does

1. **Upload a resume** (PDF / DOCX / TXT) or paste text
2. **Paste a job description**
3. Get an **ATS match score** with matched/missing keywords, 4 sub-scores (Hard Skills, Soft Skills, Searchability, Format Health), format tips + Impact Score (human-reader)
4. **Improve with AI** (Claude) → tailored resume, score improvement shown
5. **Export** to PDF or Word with 9 template designs + accent colour picker
6. **Cover letter generator** (Claude, professional English)
7. **Track job applications** on a Kanban board with drag-and-drop
8. **Dashboard** — review past scans, re-open/re-score/re-download

## Tech stack

- **Next.js 14** (App Router) — frontend + API routes
- **Tailwind CSS**
- **Scoring**: pure TS TF-cosine similarity + JD keyword coverage + Impact Score (no API, free)
- **AI rewrite**: Anthropic Claude (`claude-sonnet-4-20250514`)
- **Export**: `@react-pdf/renderer` (9 template components) + `docx` (Word)
- **Auth**: Supabase Auth (magic link + Google OAuth)
- **Billing**: Razorpay (Pro ₹199/mo or ₹999/yr + ₹49 one-shot Ek Baar)
- **Kanban**: `@dnd-kit/core` drag-and-drop
- **Hosting**: Vercel

## Run locally

```bash
npm install
cp .env.example .env        # add ANTHROPIC_API_KEY for AI features
npm run dev                 # http://localhost:3000
```

Scoring works with **zero config** — no API keys needed.  
AI features need `ANTHROPIC_API_KEY`. Auth + billing only enforce when Supabase/Razorpay env vars are set.

## Project structure

```
src/
  app/
    page.tsx                  # Landing / hero
    scan/page.tsx             # Scorer workflow + results + template gallery
    login/page.tsx            # Magic link + Google OAuth
    pricing/page.tsx          # Free / Ek Baar (₹49) / Pro (₹199/mo)
    dashboard/page.tsx        # Past scans list (re-open, delete)
    tracker/page.tsx          # Job tracker Kanban (5 columns, drag-and-drop)
    auth/callback/page.tsx    # Google OAuth callback
    api/
      score/                  # Free scoring (0-config)
      rewrite/                # Claude AI tailoring (Pro/Ek Baar)
      export/                 # PDF + Word download (Pro/Ek Baar)
      cover-letter/           # Cover letter generator (Pro)
      scans/                  # Scan history CRUD
      applications/           # Job tracker CRUD
      razorpay/
        create-subscription/  # Pro monthly/yearly
        create-order/         # Ek Baar ₹49 one-shot
        verify/               # Sub payment callback
        verify-order/         # One-shot payment callback
        webhook/              # Server-side event handler
      stripe/
        checkout/             # International fallback
        webhook/
  lib/
    score.ts                  # Deterministic ATS scoring engine
    impact.ts                 # Human-reader impact score
    rewrite.ts                # Claude rewrite (no fabrication)
    export.tsx                # PDF templates + DOCX builders
    coverletter.ts            # Claude cover letter
    parse.ts                  # PDF/DOCX/TXT → text
    resume-parser.ts          # Claude + heuristic → JSON Resume
    usage.ts                  # Plan limits + credits system
    auth.ts                   # Session + plan + credits resolution
    razorpay.ts               # Client-side Razorpay checkout
    types.ts                  # Central types
    templates/                # 9 react-pdf template components
  components/
    NavBar.tsx                # Auth-aware nav (History, Tracker, Login)
    AuthProvider.tsx          # Supabase auth context
    UpgradeModal.tsx          # Limit-hit modal (Pro + Ek Baar options)
    Logo.tsx                  # Shared logo component
```

## Freemium model

| Tier | Price | What you get |
|------|-------|-------------|
| **Bindaas** (Free) | ₹0 | Unlimited ATS scoring + Impact Score + format tips |
| **Ek Baar** (One-shot) | ₹49 | 1 AI tailor + 1 PDF/Word export (never expires) |
| **Jhakaas** (Pro) | ₹199/mo or ₹999/yr | Unlimited AI tailor + export + cover letter + history + tracker |

Payments via Razorpay (UPI, cards, net banking, wallet).

## Completed roadmap

- ✅ Day 1: Score sub-categories (Hard Skills, Soft Skills, Searchability, Format Health)
- ✅ Day 2: Naukri/LinkedIn India portal weighting + Indian skills/certs dictionary
- ✅ Day 3: Cover letter generator (Claude, professional English)
- ✅ Day 4: 9 resume templates (react-pdf, 7 ATS-safe + 2 designer)
- ✅ Day 5: Landing page + `/scan` route
- ✅ Day 6: Supabase auth (magic link + Google OAuth)
- ✅ Day 7: Usage limits + upgrade modal
- ✅ Day 8: Razorpay Pro subscription (monthly/yearly)
- ✅ Day 9: ₹49 Ek Baar one-shot credits system
- ✅ Day 10: Pricing page polish + payment trust signals
- ✅ Day 11: Dashboard/scan history (auto-save, re-open, re-download)
- ✅ Day 12: Job Tracker Kanban (@dnd-kit drag-and-drop)
- ✅ Day 13: 3 new templates (Fresher, Technical, Career Switcher)
- ✅ Day 14: Impact Score (metrics, strong verbs, weak phrases, clichés)
- ✅ Fix: Idempotent payment processing (processed_payments dedupe table)

## Deploy

```bash
# push to GitHub, import on vercel.com
# set env vars in Vercel dashboard:
#   ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY,
#   SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_* (key_id, key_secret,
#   monthly_plan_id, yearly_plan_id, webhook_secret), APP_URL
```

Run `supabase-schema.sql` in the Supabase SQL editor to create all tables.

## Getting real money

1. Create Supabase project → run `supabase-schema.sql`
2. Create Razorpay account → create monthly + yearly plans → set webhook to `/api/razorpay/webhook`
3. Set all env vars → deploy → test with Razorpay test mode
