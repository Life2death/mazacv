import { ScoreResult } from "./types";

/**
 * Deterministic, zero-cost ATS scoring.
 *
 * Real ATS systems (Workday, Taleo, Greenhouse) are mostly keyword/boolean
 * matchers, so we mimic that with two signals:
 *   1. TF cosine similarity between resume and JD (overall topical overlap)
 *   2. Keyword coverage of the JD's most important terms
 *
 * No LLM, no external API — this is what powers the free tier.
 */

const STOPWORDS = new Set(
  `a an the and or but if then else for to of in on at by with from as is are was were be been being this that these those you your we our they their it its will shall can could should would may might must do does did has have had not no nor so than too very just into over under about above below up down out off again more most other some such own same our ours i me my mine he she him her his them us who whom which what when where why how all any both each few only here there`.split(
    /\s+/
  )
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[-.]+|[-.]+$/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

function termFreq(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) || 0) + 1);
  return m;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  for (const [k, v] of a) {
    const w = b.get(k);
    if (w) dot += v * w;
  }
  const magA = Math.sqrt([...a.values()].reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt([...b.values()].reduce((s, v) => s + v * v, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Pull the most "important" keywords from the JD: highest-frequency content
 * terms plus any capitalized/known tech tokens. Returns up to `limit` terms.
 */
function importantKeywords(jdText: string, limit = 30): string[] {
  const tokens = tokenize(jdText);
  const tf = termFreq(tokens);
  return [...tf.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

export function scoreResume(resumeText: string, jdText: string): ScoreResult {
  const resumeTokens = tokenize(resumeText);
  const jdTokens = tokenize(jdText);

  const similarity = cosine(termFreq(resumeTokens), termFreq(jdTokens));

  const resumeSet = new Set(resumeTokens);
  const keywords = importantKeywords(jdText);
  const matchedKeywords = keywords.filter((k) => resumeSet.has(k));
  const missingKeywords = keywords.filter((k) => !resumeSet.has(k));
  const keywordCoverage =
    keywords.length === 0 ? 0 : matchedKeywords.length / keywords.length;

  // Weighted blend: keyword coverage matters most for real ATS.
  const score = Math.round(
    (0.6 * keywordCoverage + 0.4 * similarity) * 100
  );

  const warnings = formatWarnings(resumeText);

  return {
    score,
    similarity: Math.round(similarity * 100),
    keywordCoverage: Math.round(keywordCoverage * 100),
    matchedKeywords,
    missingKeywords,
    warnings,
  };
}

function formatWarnings(resumeText: string): string[] {
  const warnings: string[] = [];
  const words = resumeText.split(/\s+/).filter(Boolean).length;
  if (words < 200)
    warnings.push(
      "Resume seems short (<200 words). ATS parsers prefer detailed, keyword-rich content."
    );
  if (!/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/.test(resumeText))
    warnings.push("No email address detected — make sure contact info is plain text.");
  if (!/\b(experience|work history|employment)\b/i.test(resumeText))
    warnings.push('Add a clearly labeled "Experience" section header.');
  if (!/\b(education|qualification)\b/i.test(resumeText))
    warnings.push('Add a clearly labeled "Education" section header.');
  if (!/\b(skills|technologies|competencies)\b/i.test(resumeText))
    warnings.push('Add a "Skills" section — ATS systems scan it heavily for keywords.');
  return warnings;
}
