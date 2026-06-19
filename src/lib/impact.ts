/**
 * Impact Score — measures how compelling a resume is for a human reader.
 *
 * Rewards quantified achievements, strong action verbs, and concise writing.
 * Penalises weak phrasing, clichés, and vagueness.
 */

import type { ImpactResult } from "./types";

const STRONG_VERBS = new Set([
  "led", "managed", "created", "developed", "implemented", "launched", "delivered",
  "built", "designed", "engineered", "architected", "optimised", "optimized",
  "improved", "increased", "decreased", "reduced", "accelerated", "streamlined",
  "automated", "transformed", "generated", "drove", "established", "founded",
  "pioneered", "introduced", "negotiated", "secured", "produced", "achieved",
  "exceeded", "surpassed", "mentored", "coached", "spearheaded", "championed",
  "orchestrated", "consolidated", "restructured", "overhauled", "revamped",
  "integrated", "migrated", "deployed", "scaled", "grew", "boosted", "elevated",
  "resolved", "solved", "tripled", "doubled", "raised", "won", "awarded",
  "selected", "promoted", "certified", "published", "patented",
]);

const WEAK_PHRASES = [
  /\bwas\s+responsible\s+for\b/i,
  /\bwas\s+involved\s+in\b/i,
  /\bhelped\s+(with|to)\b/i,
  /\bworked\s+on\b/i,
  /\btasked?\s+with\b/i,
  /\bpart\s+of\s+(a\s+)?team\b/i,
  /\bduties?\s+(included|involve)\b/i,
  /\bresponsible\s+for\b/i,
  /\bhandled\b/i,
  /\bparticipated\s+in\b/i,
  /\bassisted\s+(with|in)\b/i,
  /\bsupported\b(?=\s+(the|a|an)\s+(team|department|project))/i,
];

const CLICHES = [
  /\bthink(ing)?\s+outside\s+(the\s+)?box\b/i,
  /\bsynergy\b/i,
  /\brockstar\b/i,
  /\bninja\b/i,
  /\bgo[-\s]getter\b/i,
  /\bresults[-\s]driven\b/i,
  /\bteam\s+player\b/i,
  /\bhard[-\s]working\b/i,
  /\bself[-\s]motivated\b/i,
  /\bpassionate\s+about\b/i,
  /\bproven\s+track\s+record\b/i,
  /\bhit\s+the\s+ground\s+running\b/i,
  /\bthink\s+outside\s+the\s+box\b/i,
  /\bleveraging\b/i,
  /\bholistic\b/i,
  /\bbest\s+of\s+both\s+worlds\b/i,
  /\bgame[-\s]changer\b/i,
  /\bdeep\s+dive\b/i,
  /\bbandwidth\b(?=\s+(to\s+)?(handle|take|manage))/i,
  /\boffline\b(?=\s+(to\s+)?discuss)/i,
  /\btouch\s+base\b/i,
  /\bcircle\s+back\b/i,
  /\bvalue[-\s]add(ed)?\b/i,
];

/** Count quantified achievements: %, numbers, ₹, $, multipliers, etc. */
function countMetrics(text: string): number {
  const metricPatterns = [
    /\b\d+(?:\.\d+)?\s*(%|percent)\b/gi,
    /\b₹\s*\d+(?:[,\s]\d{3})*(?:\.\d+)?(?:\s*(?:lakh|crore|k|million|billion))?\b/gi,
    /\$\s*\d+(?:[,\s]\d{3})*(?:\.\d+)?(?:\s*(?:million|billion|k|M|B))\b/gi,
    /\b\d+(?:[,\s]\d{3})*(?:\.\d+)?\s*(x|times?|fold)\b/gi,
    /\b(?:increased?|decreased?|reduced?|grew|improved|boosted|raised|lost|saved)\s+by\s+\d+/gi,
    /\b\d+(?:\.\d+)?\s*(?:years?|months?)\s+of\s+(?:experience|expertise)\b/gi,
    /\b(?:over|more\s+than|under|within)\s+\d+/gi,
    /\b(?:revenue|profit|sales|costs?|budget|team\s+size|headcount|users?|customers?|clients?|projects?)\s+.*?\b\d+/gi,
    /\b\d+\s*\+\s*(?:years?|months?|teams?|people|employees?|members?)\b/gi,
    /\b(?:managed?|led?|supervised|mentored|trained)\s+\d+/gi,
  ];

  const found = new Set<string>();
  for (const pattern of metricPatterns) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.source, "gi");
    while ((match = re.exec(text)) !== null) {
      found.add(match[0].trim());
    }
  }
  return found.size;
}

function findStrongVerbs(text: string): string[] {
  const lower = text.toLowerCase();
  const tokens = lower.split(/[^a-z]+/).filter(Boolean);
  return [...new Set(tokens.filter((t) => STRONG_VERBS.has(t)))];
}

function findWeakPhrases(text: string): string[] {
  const found: string[] = [];
  for (const pattern of WEAK_PHRASES) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) found.push(match[0].trim());
    }
  }
  return [...new Set(found)];
}

function findCliches(text: string): string[] {
  const found: string[] = [];
  for (const pattern of CLICHES) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) found.push(match[0].trim());
    }
  }
  return [...new Set(found)];
}

export function scoreImpact(resumeText: string): ImpactResult {
  const strongVerbs = findStrongVerbs(resumeText);
  const weakPhrases = findWeakPhrases(resumeText);
  const cliches = findCliches(resumeText);
  const metricsFound = countMetrics(resumeText);

  // Components
  const verbScore = Math.min(strongVerbs.length * 10, 40);
  const metricScore = Math.min(metricsFound * 8, 35);
  const weakPenalty = Math.min(weakPhrases.length * 15, 30);
  const clichePenalty = Math.min(cliches.length * 10, 20);

  const impactScore = Math.max(0, Math.min(100, verbScore + metricScore - weakPenalty - clichePenalty));

  return {
    impactScore,
    metricsFound,
    strongVerbs,
    weakPhrases,
    cliches,
  };
}
