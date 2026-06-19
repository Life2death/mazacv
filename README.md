# MazaCV — Free ATS Resume Scorer + AI Tailoring

A hostable web app where anyone can:

1. **Upload a resume** (PDF / DOCX / TXT)
2. **Paste a job description**
3. Get an **ATS match score** with matched/missing keywords + format tips — **free**
4. Click **Improve with AI** to get a tailored resume (Claude), then **export to PDF or Word**

Freemium model: scoring is free and near-zero-cost (deterministic, no LLM);
AI rewrite + export are the paid "Pro" features.

## Tech stack

- **Next.js 14** (App Router) — frontend + API routes in one deployable
- **Tailwind CSS**
- **Scoring**: pure TS TF-cosine similarity + JD keyword coverage (no API, free)
- **AI rewrite**: Anthropic Claude (`claude-opus-4-8`), with a strict no-fabrication prompt
- **Export**: `docx` (Word) + `pdf-lib` (PDF)
- **Auth + limits**: Supabase (optional)
- **Billing**: Stripe (optional)
- **Hosting**: Vercel

## Run locally

```bash
npm install
cp .env.example .env        # add ANTHROPIC_API_KEY for the AI rewrite
npm run dev                 # http://localhost:3000
```

Scoring works with **no keys**. The AI rewrite needs `ANTHROPIC_API_KEY`.
Without Supabase configured, the app runs fully open (no limits) — perfect for
testing and a free public beta.

## Going freemium (enable limits + payments)

1. **Supabase**: create a project, run [`supabase-schema.sql`](./supabase-schema.sql),
   then set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
   Free-plan limits (in `src/lib/usage.ts`) then auto-enforce:
   - Free: 3 scores/day, 1 AI rewrite/month, no export
   - Pro: unlimited
   *(Wire Supabase Auth UI in the frontend — see TODO in `src/lib/auth.ts`.)*
2. **Stripe**: create a recurring Price, set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`,
   `STRIPE_WEBHOOK_SECRET`. Point the webhook at `/api/stripe/webhook`.
   On payment, the user's `profiles.plan` flips to `pro`.

## Deploy to Vercel

```bash
# push to GitHub, then "Import Project" on vercel.com
# add the same env vars in the Vercel dashboard
```

`/api/*` routes run on the Node runtime (needed for PDF/DOCX parsing).

## Project structure

```
src/
  app/
    page.tsx              # the whole UI (upload → score → improve → export)
    api/score/            # free scoring
    api/rewrite/          # Claude tailoring (Pro)
    api/export/           # PDF / Word download (Pro)
    api/stripe/           # checkout + webhook
  lib/
    parse.ts              # PDF/DOCX/TXT → text
    score.ts              # deterministic ATS scoring
    rewrite.ts            # Claude rewrite (no fabrication)
    export.ts             # docx + pdf builders
    usage.ts              # plan limits (graceful w/o Supabase)
    auth.ts               # session + plan resolution
```

## Status

- ✅ Phase 1 — parsing + free scoring
- ✅ Phase 2 — Claude rewrite + PDF/Word export
- ✅ Phase 3/4 — auth + usage limits + Stripe (wired; add your keys + Supabase Auth UI)
- ⬜ Polish — multiple templates, saved history, social login UI
