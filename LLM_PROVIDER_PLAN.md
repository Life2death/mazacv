# LLM Provider Plan — OpenRouter free tier for free-plan actions

> **Date:** 2026-06-23
> **Goal:** cut AI cost by routing **free-plan** users' AI actions to **OpenRouter
> free models**, while keeping **Pro** users on Claude (quality). One small provider
> abstraction; no behaviour change for Pro.
> **Status: PLANNING — build to this spec.**

---

## 1. Current state (what we're changing)

Four modules call the Anthropic SDK **directly**, each with the same shape
(`pickModel(plan)` → Sonnet for free, Opus for Pro, read `ANTHROPIC_API_KEY`):

- `src/lib/coverletter.ts`
- `src/lib/linkedin.ts`
- `src/lib/rewrite.ts`
- `src/lib/resume-parser.ts` (skill extraction / structured parse)

Every free-plan call today hits **Claude Sonnet = real money**. That's the cost to kill.

---

## 2. Design — one abstraction, two providers

Add **`src/lib/llm.ts`** — a single `complete()` used by all four modules.

```ts
export type Plan = "free" | "pro";
export interface LlmRequest {
  system: string;
  user: string;           // the prompt content
  maxTokens?: number;
  temperature?: number;
  json?: boolean;         // hint: expect JSON back (tightens parsing/temperature)
  plan: Plan;
  task: "rewrite" | "coverletter" | "linkedin" | "parse";
}
export interface LlmResult { text: string; provider: string; model: string; }

export async function complete(req: LlmRequest): Promise<LlmResult> { ... }
```

**Routing rule (inside `complete`):**
- `plan === "pro"` → **Anthropic** (unchanged: Sonnet/Opus via `@anthropic-ai/sdk`).
- `plan === "free"` → **OpenRouter free model** (primary) with a **fallback chain**
  (next free model → finally Anthropic Sonnet) so a rate-limited/down free model never
  breaks the user.
- If `OPENROUTER_API_KEY` is unset → fall back to Anthropic for everyone (zero-config:
  nothing breaks, you just don't save money yet).

**Why not reuse the Anthropic SDK for OpenRouter?** Different message format. OpenRouter
is **OpenAI-compatible**, so call it with the `openai` SDK pointed at
`https://openrouter.ai/api/v1`, or a thin `fetch` to `/chat/completions`. Keep the
Anthropic SDK for the Anthropic path. `llm.ts` hides both behind `complete()`.

---

## 3. OpenRouter specifics (the gotchas that matter)

1. **Free models change** — do NOT hardcode-and-forget. Resolve the current free list
   from `https://openrouter.ai/models?max_price=0` and keep a short candidate array in
   config. Good current candidates (verify before use): `deepseek/deepseek-chat-v3:free`,
   `meta-llama/llama-3.3-70b-instruct:free`, `google/gemini-2.0-flash-exp:free`,
   `qwen/qwen-2.5-72b-instruct:free`. Pick 2–3 for the fallback chain.
2. **Rate limits are real** — free models cap requests/min and per-day (and OpenRouter
   throttles free usage account-wide). Handle `429`/`5xx` by advancing the fallback chain;
   surface a friendly "thoda busy hai, dobara try karo" only if ALL fall through.
3. **Required headers** — send `HTTP-Referer: https://mazacv.in` and `X-Title: MazaCV`
   (OpenRouter uses these for free-tier eligibility/attribution).
4. **Weaker JSON adherence** — free models are sloppier than Claude at returning clean
   JSON (matters for `resume-parser` skill extraction). Harden parsing: strip code fences,
   extract the first `{...}`/`[...]`, `try/catch` with one repair retry, and on total
   failure fall back to Anthropic for that single call. Set `temperature: 0` for `json`
   tasks.
5. **Token/length** — free models often have smaller effective context and stricter
   output caps; keep prompts tight and `maxTokens` modest.

---

## 4. ⚠️ Privacy guardrail (resume = personal data) — decide before shipping

Resumes are PII. **Many OpenRouter free models log/▒train on prompts** (that's part of
why they're free), and route through third-party providers. Sending a user's full resume
to a training-enabled free model is a privacy exposure MazaCV's landing page explicitly
promises against ("Your data stays private 🔒").

**Options (pick one — flag for owner):**
- **(a) Safest:** use free models ONLY for **non-PII or low-sensitivity** transforms
  (e.g. generic phrasing) and keep **resume-bearing** calls (rewrite, parse, cover letter,
  linkedin — basically all four) on Anthropic. → This negates most of the savings.
- **(b) Balanced (recommended):** enable OpenRouter's **data-retention-off / no-train**
  setting where the model supports it, prefer free models that honour zero-retention, and
  document in the privacy copy that free-tier AI may use third-party models. Strip obvious
  PII (name, email, phone) from the prompt before sending where feasible.
- **(c) Cheapest, riskiest:** send everything to free models. **Not recommended** given the
  privacy promise.

**Do not ship free-model routing for resume content without the owner choosing (a/b/c).**

---

## 5. Implementation steps

1. **`src/lib/llm.ts`** — `complete()` with Anthropic path (move the existing
   `pickModel`/`messages.create` logic here) + OpenRouter path (OpenAI-compatible) +
   fallback chain + hardened JSON helper (`extractJson(text)`).
2. **Config/env:**
   - `OPENROUTER_API_KEY` (Vercel). Unset → everyone uses Anthropic.
   - `LLM_FREE_MODELS` (optional CSV override of the free candidate list).
   - Keep `ANTHROPIC_API_KEY` as-is (Pro + fallback).
3. **Refactor the 4 modules** to call `complete({ system, user, plan, task, json })`
   instead of `new Anthropic(...).messages.create(...)`. Delete the per-module
   `pickModel`/client setup (now centralized). Keep prompts identical.
4. **Per-task model policy** in `llm.ts`: e.g. `parse`/`rewrite` (need structure/quality)
   get the strongest free model first; `coverletter`/`linkedin` (more forgiving) can use a
   smaller/faster free model. Pro always Anthropic.
5. **Observability:** return `{provider, model}` from `complete()` and log it (which
   provider served each call) so you can see savings + free-model failure rates.
6. **Verify:** `npm run build`; run each of the 4 actions as a free user (OpenRouter) and a
   Pro user (Anthropic); confirm JSON parse survives a deliberately messy free-model reply
   (fallback kicks in).

---

## 6. Guardrails
- **Zero-config:** no `OPENROUTER_API_KEY` → silently use Anthropic; nothing breaks.
- **Never let a free-model failure surface as a hard error** — fallback chain ends at
  Anthropic Sonnet.
- **Pro experience unchanged** — Pro stays on Claude, same models.
- **Privacy:** resume-bearing calls follow the Section-4 decision; default to the
  conservative option until the owner picks.
- **Quality bar:** if a free model's output for `parse`/`rewrite` is visibly worse,
  prefer correctness over cost — it's fine for a task to be Anthropic-only.
- **No secrets in code/logs;** OpenRouter key only in env.

## 7. What's needed from the owner
- An **OpenRouter API key** (`OPENROUTER_API_KEY` in Vercel). Free models still need a key.
- A decision on **Section 4 (privacy)** — which calls may use free models on resume data.
- (Optional) preferred free models if you want to pin specific ones.
