import Anthropic from "@anthropic-ai/sdk";
import { CoverLetterResult } from "./types";

export async function generateCoverLetter(
  resumeText: string,
  jdText: string
): Promise<CoverLetterResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

  const client = new Anthropic({ apiKey });

  const system = `You write professional cover letters for job applications.

Write a cover letter based on the candidate's actual resume and the target job description.

ABSOLUTE RULES — never break these:
- Only use facts present in the candidate's resume. Do NOT fabricate experience, skills, or achievements.
- Professional English only — no slang, no Hinglish.
- 3-4 paragraphs: introduction, why the candidate fits the role, a key achievement relevant to the role, closing.
- Address to "[Hiring Manager]" unless the JD specifies a name.
- Match the tone of the job description (formal or conversational).
- Keep it concise — under 350 words.

Return STRICT JSON only, no markdown fences, with this shape:
{"coverLetter": "<full cover letter>", "changes": ["key fact used from resume", ...]}`;

  const user = `TARGET JOB DESCRIPTION:
${jdText}

CANDIDATE'S RESUME:
${resumeText}

Write a tailored cover letter for this candidate.`;

  const msg = await client.messages.create({
    model: "claude-opus-4-8",
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

function parseResult(text: string): CoverLetterResult {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    return { coverLetter: cleaned, changes: [] };
  }
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    return {
      coverLetter: String(obj.coverLetter ?? "").trim(),
      changes: Array.isArray(obj.changes) ? obj.changes.map(String) : [],
    };
  } catch {
    return { coverLetter: cleaned, changes: [] };
  }
}
