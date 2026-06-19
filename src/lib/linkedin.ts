import Anthropic from "@anthropic-ai/sdk";
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

export interface LinkedInOptimizeResult {
  headline: string;
  summary: string;
  skillsToAdd: string[];
  skillsToRemove: string[];
  suggestions: string[];
}

export async function optimizeLinkedIn(
  about: string,
  experience: string,
  targetJd: string,
  plan?: Plan
): Promise<LinkedInOptimizeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

  const client = new Anthropic({ apiKey });

  const system = `You are a LinkedIn profile optimization specialist for the Indian job market.
The user will provide their LinkedIn About section, Experience section, and a target job description.

Return STRICT JSON only, no markdown fences, with this shape:
{
  "headline": "optimized headline (under 220 chars, includes key skills for the target role)",
  "summary": "optimized About section (3-4 paragraphs, keyword-rich but natural, under 2000 chars)",
  "skillsToAdd": ["skill1", "skill2"],
  "skillsToRemove": ["outdated skill"],
  "suggestions": ["actionable tip 1", "actionable tip 2"]
}

Rules:
- Headline must be under 220 characters and include role-specific keywords.
- Summary should be professional English, under 2000 characters, highlight achievements relevant to the target role.
- skillsToAdd: top 5-10 skills from the JD missing from the profile.
- skillsToRemove: skills on the profile that are irrelevant to the target role.
- suggestions: 3-5 actionable steps to improve the profile (e.g., add certifications, request recommendations, etc.).
- Do NOT invent experience the candidate doesn't have.`;

  const user = `LINKEDIN ABOUT:
${truncate(about, "About")}

LINKEDIN EXPERIENCE:
${truncate(experience, "Experience")}

TARGET JOB DESCRIPTION:
${truncate(targetJd, "JD")}

Optimize this LinkedIn profile for the target role.`;

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

function parseResult(text: string): LinkedInOptimizeResult {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    return { headline: "", summary: "", skillsToAdd: [], skillsToRemove: [], suggestions: [] };
  }
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    return {
      headline: String(obj.headline ?? "").trim(),
      summary: String(obj.summary ?? "").trim(),
      skillsToAdd: Array.isArray(obj.skillsToAdd) ? obj.skillsToAdd.map(String) : [],
      skillsToRemove: Array.isArray(obj.skillsToRemove) ? obj.skillsToRemove.map(String) : [],
      suggestions: Array.isArray(obj.suggestions) ? obj.suggestions.map(String) : [],
    };
  } catch {
    return { headline: "", summary: "", skillsToAdd: [], skillsToRemove: [], suggestions: [] };
  }
}
