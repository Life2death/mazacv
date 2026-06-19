import { ScoreResult, ScoreSubCategories, Portal } from "./types";

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

const SOFT_SKILLS = new Set([
  "communication", "leadership", "teamwork", "collaboration", "problem-solving",
  "analytical", "critical thinking", "time management", "adaptability", "flexibility",
  "interpersonal", "negotiation", "presentation", "mentoring", "project management",
  "conflict resolution", "decision-making", "organizational", "detail-oriented",
  "multitasking", "creative", "innovation", "strategic", "planning", "customer service",
  "stakeholder management", "cross-functional", "self-motivated", "proactive",
  "team player", "interpersonal skills", "verbal communication", "written communication",
  "public speaking", "active listening", "empathy", "emotional intelligence",
  "accountability", "dependability", "reliability", "initiative", "resourceful",
  "problem solver", "critical thinker", "fast learner", "self-starter",
  "results-oriented", "goal-oriented", "detail oriented", "big picture",
  "coaching", "training", "supervision", "delegation", "prioritization",
  "people management", "client relations", "vendor management", "change management",
  "risk management", "negotiation skills", "persuasion", "motivation",
]);

const INDIAN_SKILLS = new Set([
  "core java", "spring boot", "microservices", "rest api", "hibernate",
  "sql", "mysql", "postgresql", "oracle", "mongodb", "redis", "kafka",
  "docker", "kubernetes", "aws", "azure", "gcp", "devops", "ci/cd",
  "jenkins", "terraform", "ansible", "maven", "gradle", "jira",
  "agile", "scrum", "servicenow", "salesforce", "sap", "pega",
  "mainframe", "cobol", "react", "angular", "node.js", "python",
  "django", "flask", "machine learning", "data science", "tableau",
  "power bi", "etl", "informatica", "talend", "data warehouse",
  "manual testing", "automation testing", "selenium", "jmeter",
  "api testing", "regression testing", "uat", "production support",
  "l2 support", "l3 support", "itil", "iics", "mulesoft", "boomi",
  "workday", "peoplesoft", "oracle fusion", "sap abap", "sap fi",
  "full stack", "mean stack", "mern stack",
  "azure devops", "azure functions", "powerapps", "power automate",
  "sharepoint", ".net", "c#", "asp.net", "mvc", "web api",
  "entity framework", "typescript", "redux", "express.js",
  "saas", "paas", "iaas", "crm", "erp", "bi tools", "cloud migration",
  "digital transformation", "global delivery", "sdlc", "waterfall",
  "manual testing", "automation testing", "api testing",
  "production support", "change management",
]);

const INDIAN_CERTIFICATIONS = new Set([
  "aws certified", "azure certified", "pmp", "prince2", "scrum master",
  "csm", "psm", "itil", "istqb", "ocp", "ocjp", "scjp",
  "ccna", "ccnp", "ceh", "cissp", "cisa",
  "six sigma", "green belt", "black belt", "comptia",
]);

/** Match multi-word phrases from a dictionary against raw text (lowercased). */
function matchPhrasesInText(text: string, dictionary: Set<string>): string[] {
  const lower = text.toLowerCase();
  return [...dictionary].filter((phrase) => lower.includes(phrase));
}

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
 * terms plus any capitalized/known tech tokens. Also merges Indian-specific
 * skills and certifications found in the raw text. Returns up to `limit` terms.
 */
function importantKeywords(jdText: string, limit = 30): string[] {
  const tokens = tokenize(jdText);
  const tf = termFreq(tokens);
  const freqTerms = [...tf.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);

  // Merge Indian skills/certs found in raw JD text
  const indianSkills = matchPhrasesInText(jdText, INDIAN_SKILLS);
  const indianCerts = matchPhrasesInText(jdText, INDIAN_CERTIFICATIONS);

  return [...new Set([...freqTerms, ...indianSkills, ...indianCerts])];
}

function classifyKeywords(
  keywords: string[],
  rawText: string
): { hard: string[]; soft: string[] } {
  const hard: string[] = [];
  const soft: string[] = [];
  const matchedSoft = matchPhrasesInText(rawText, SOFT_SKILLS);
  for (const k of keywords) {
    if (matchedSoft.includes(k) || SOFT_SKILLS.has(k)) {
      soft.push(k);
    } else {
      hard.push(k);
    }
  }
  return { hard, soft };
}

/** Searchability = how easily a machine can parse structured data from the resume. */
function computeSearchability(resumeText: string): number {
  let score = 0;
  // Contact info parseable (email, phone)
  if (/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/.test(resumeText)) score += 25;
  if (/\b[\+\(]?\d[\d\s\-\(\)]{7,}\d\b/.test(resumeText)) score += 15;

  // Section headers detected as clear delimiters
  if (/\b(experience|work history|employment)\b/i.test(resumeText)) score += 20;
  if (hasIndianEducation(resumeText) || /\b(education|qualification)\b/i.test(resumeText)) score += 20;
  if (/\b(skills|technologies|competencies)\b/i.test(resumeText)) score += 20;

  return Math.min(score, 100);
}

/** Format Health = structural quality for ATS, derived from warnings + metric density. */
function computeFormatHealth(
  resumeText: string,
  structuralWarningCount: number
): number {
  let score = 100;
  // Deduct based on structural issues (each warning = -20)
  score -= structuralWarningCount * 20;

  // Bonus for metric density (numbers, percentages, amounts)
  const metricsCount = (
    resumeText.match(
      /\b\d+(?:\.\d+)?\s*(?:%|percent|lakh|million|k|₹|\$|years?|months?|x\s*[0-9])/gi
    ) || []
  ).length;
  score += Math.min(metricsCount * 5, 20);

  return Math.max(Math.min(score, 100), 0);
}

export function scoreResume(resumeText: string, jdText: string, portal: Portal = "generic"): ScoreResult {
  const resumeTokens = tokenize(resumeText);
  const jdTokens = tokenize(jdText);

  const similarity = cosine(termFreq(resumeTokens), termFreq(jdTokens));

  const resumeSet = new Set(resumeTokens);
  const keywords = importantKeywords(jdText);
  const matchedKeywords = keywords.filter((k) => resumeSet.has(k));
  const missingKeywords = keywords.filter((k) => !resumeSet.has(k));
  const keywordCoverage =
    keywords.length === 0 ? 0 : matchedKeywords.length / keywords.length;

  // Portal-adjusted weighting
  const weightMap: Record<Portal, { kw: number; sim: number }> = {
    generic: { kw: 0.6, sim: 0.4 },
    naukri: { kw: 0.7, sim: 0.3 },
    linkedin_india: { kw: 0.5, sim: 0.5 },
  };
  const w = weightMap[portal];
  let score = Math.round((w.kw * keywordCoverage + w.sim * similarity) * 100);

  // Portal-specific boost for Indian skills/certs
  if (portal === "naukri") {
    const resumeIndianSkills = matchPhrasesInText(resumeText, INDIAN_SKILLS);
    const jdIndianSkills = matchPhrasesInText(jdText, INDIAN_SKILLS);
    if (jdIndianSkills.length > 0 && resumeIndianSkills.length > 0) {
      const indianRatio = resumeIndianSkills.length / jdIndianSkills.length;
      score = Math.min(score + Math.round(indianRatio * 5), 100);
    }
  }

  const warnings = formatWarnings(resumeText, portal);

  // Sub-category scores
  const classified = classifyKeywords(keywords, jdText);
  const matchedClassified = classifyKeywords(matchedKeywords, resumeText);

  const hardSkills = classified.hard.length === 0
    ? null
    : Math.round((matchedClassified.hard.length / classified.hard.length) * 100);

  const softSkills = classified.soft.length === 0
    ? null
    : Math.round((matchedClassified.soft.length / classified.soft.length) * 100);

  const searchability = computeSearchability(resumeText);

  // Count only structural warnings (exclude portal-specific tips)
  const structuralWarningCount = warnings.filter(
    (w) => !w.startsWith("For Naukri") && !w.startsWith("For LinkedIn")
  ).length;
  const formatHealth = computeFormatHealth(resumeText, structuralWarningCount);

  // Indian cert bonus to searchability
  let adjustedSearchability = searchability;
  if (matchPhrasesInText(resumeText, INDIAN_CERTIFICATIONS).length > 0) {
    adjustedSearchability = Math.min(searchability + 10, 100);
  }

  const subScores: ScoreSubCategories = {
    hardSkills,
    softSkills,
    searchability: adjustedSearchability,
    formatHealth,
  };

  return {
    score,
    similarity: Math.round(similarity * 100),
    keywordCoverage: Math.round(keywordCoverage * 100),
    matchedKeywords,
    missingKeywords,
    warnings,
    subScores,
  };
}

function hasIndianEducation(resumeText: string): boolean {
  const indianDegree = /\b(B\.E|B\.Tech|M\.Tech|MCA|BCA|MBA|BBA|M\.Sc|B\.Sc|B\.Com|M\.Com|LLB|BBA|Diploma|Polytechnic|BE\s|BTech\s|MTech\s)\b/i;
  const cgpa = /\b\d\.\d{1,2}\s*\/\s*10\b/;
  const percentage = /\b\d{1,3}\s*%/;
  const yearPattern = /\b(?:passed|completed|pursuing|graduated)\s+\d{4}\b/i;
  return indianDegree.test(resumeText) || cgpa.test(resumeText) || percentage.test(resumeText) || yearPattern.test(resumeText);
}

function formatWarnings(resumeText: string, portal: Portal = "generic"): string[] {
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
  if (!/\b(education|qualification)\b/i.test(resumeText) && !hasIndianEducation(resumeText))
    warnings.push('Add a clearly labeled "Education" section header.');
  if (!/\b(skills|technologies|competencies)\b/i.test(resumeText))
    warnings.push('Add a "Skills" section — ATS systems scan it heavily for keywords.');

  // Portal-specific tips
  if (portal === "naukri") {
    warnings.push("For Naukri: keep your resume under 2 pages and use bullet points for achievements.");
    warnings.push("Naukri ATS prefers standard section headers — avoid creative formatting.");
  } else if (portal === "linkedin_india") {
    warnings.push("For LinkedIn India: ensure your headline and summary match the target role keywords.");
    warnings.push("LinkedIn's native search favours complete profiles with recommendations.");
  }

  return warnings;
}
