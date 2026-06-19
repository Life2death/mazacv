import Anthropic from "@anthropic-ai/sdk";
import { RewriteResult } from "./types";
import type { Plan } from "./usage";

const MAX_INPUT_CHARS = 15000;
const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const PRO_MODEL = "claude-opus-4-8";

function truncate(text: string, label: string): string {
  if (text.length > MAX_INPUT_CHARS) {
    console.warn(`[LLM Cost] ${label} truncated from ${text.length} to ${MAX_INPUT_CHARS} chars`);
    return text.slice(0, MAX_INPUT_CHARS) + "\n\n[TRUNCATED — input too long]";
  }
  return text;
}

function pickModel(plan?: Plan): string {
  if (plan === "pro") return process.env.CLAUDE_PRO_MODEL ?? PRO_MODEL;
  return process.env.CLAUDE_DEFAULT_MODEL ?? DEFAULT_MODEL;
}

/**
 * AI resume rewrite — the PAID feature.
 *
 * Hard constraint: rephrase / reorder / surface existing experience only.
 * The model is explicitly told NOT to invent jobs, dates, titles, or skills the
 * candidate doesn't have. This keeps the output honest and ATS-safe.
 */
export async function rewriteResume(
  resumeText: string,
  jdText: string,
  missingKeywords: string[],
  plan?: Plan
): Promise<RewriteResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

  const client = new Anthropic({ apiKey });

  const system = `You are an expert resume writer and ATS optimization specialist.
Rewrite the candidate's resume so it scores higher against the target job description.

ABSOLUTE RULES — never break these:
- Do NOT fabricate employers, job titles, dates, degrees, certifications, or metrics.
- Only rephrase, reorder, and emphasize experience the candidate ALREADY has.
- You may naturally weave in missing keywords ONLY where the candidate plausibly
  has that experience based on their existing content. If unsure, leave it out.
- Keep it truthful, concise, and in clean plain text suitable for ATS parsing.

Return STRICT JSON only, no markdown fences, with this shape:
{"resume": "<full rewritten resume as plain text>", "changes": ["short note", ...]}`;

  const user = `TARGET JOB DESCRIPTION:
${truncate(jdText, "JD")}

MISSING KEYWORDS TO TRY TO ADDRESS (only if truthful):
${missingKeywords.join(", ")}

CURRENT RESUME:
${truncate(resumeText, "Resume")}`;

  const msg = await client.messages.create({
    model: pickModel(plan),
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return parseResult(text);
}

function parseResult(text: string): RewriteResult {
  // Strip accidental markdown fences, then grab the first {...} object.
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    return { resume: cleaned, changes: [] };
  }
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    return {
      resume: String(obj.resume ?? "").trim(),
      changes: Array.isArray(obj.changes) ? obj.changes.map(String) : [],
    };
  } catch {
    return { resume: cleaned, changes: [] };
  }
}
