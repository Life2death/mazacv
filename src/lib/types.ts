export interface ScoreSubCategories {
  hardSkills: number | null;
  softSkills: number | null;
  searchability: number;
  formatHealth: number;
}

export interface ImpactResult {
  impactScore: number;
  metricsFound: number;
  strongVerbs: string[];
  weakPhrases: string[];
  cliches: string[];
}

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
  /** Sub-category scores for deeper analysis */
  subScores: ScoreSubCategories;
  /** Human-reader impact score 0-100 */
  impact: ImpactResult;
}

export type Portal = "generic" | "naukri" | "linkedin_india";

export interface CoverLetterResult {
  coverLetter: string;
  changes: string[];
}

export interface JsonResume {
  basics: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    summary?: string;
    headline?: string;
  };
  skills: Array<{
    name: string;
    keywords: string[];
  }>;
  work: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    highlights: string[];
  }>;
  education: Array<{
    institution: string;
    area: string;
    studyType: string;
    startDate: string;
    endDate?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer?: string;
    date?: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    highlights: string[];
  }>;
  languages?: Array<{
    language: string;
    fluency: string;
  }>;
}

export type Credits = {
  rewrite?: number;
  export?: number;
  "cover-letter"?: number;
};

export type TemplateId = "classic" | "modern" | "compact" | "split" | "minimal" | "professional" | "fresher" | "technical" | "career-switcher";

export interface TemplateInfo {
  id: TemplateId;
  name: string;
  tier: "ats-safe" | "designer";
  description: string;
}

export interface ResumePage {
  slug: string;
  scan_id: string;
  user_id: string;
  parsed_resume: JsonResume;
  template_id: TemplateId;
  accent_color: string;
  published: boolean;
  created_at: string;
}

export interface RewriteResult {
  /** The rewritten resume as plain text (one logical line per row) */
  resume: string;
  /** Short bullet list of what changed and why */
  changes: string[];
}
