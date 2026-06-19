export interface ScoreResult {
  /** Overall ATS match score, 0-100 */
  score: number;
  /** Cosine similarity component, 0-100 */
  similarity: number;
  /** Keyword coverage component, 0-100 */
  keywordCoverage: number;
  /** Important JD keywords found in the resume */
  matchedKeywords: string[];
  /** Important JD keywords missing from the resume */
  missingKeywords: string[];
  /** Format/ATS-friendliness warnings */
  warnings: string[];
}

export interface RewriteResult {
  /** The rewritten resume as plain text (one logical line per row) */
  resume: string;
  /** Short bullet list of what changed and why */
  changes: string[];
}
