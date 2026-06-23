// Ported from Life2death/job-hunter — scoring rubric + constants + canonical_url

// ─── Constants (from settings.json) ──────────────────────────────────────────

export const SAFE_KEYWORDS = ["safe", "pi planning", "agile release train", "scaled agile", "less framework", "nexus", "scrum@scale", "lean agile", "lean portfolio", "art sync"];
export const BFSI_KEYWORDS = ["bank", "banking", "financial services", "fintech", "insurance", "payments", "capital markets", "credit", "lending", "wealth", "asset management", "securities", "trading", "broking"];
export const GOVERNANCE_KW = ["program governance", "raid", "steering committee", "p&l", "budget", "pmo", "transformation", "portfolio", "roadmap", "stakeholder management", "delivery governance"];
export const SCOPE_KW = ["p&l", "portfolio", "multi-account", "org building", "headcount", "span of control", "delivery org", "practice lead"];
export const SENIOR_PM_KW = ["senior program", "sr program", "technical program", "delivery program", "tpm", "program governance"];
export const NEGATIVE_KW = ["intern", "internship", "fresher", "trainee", "graduate program", "entry level", "junior"];

export const TIER1_BFSI = ["barclays", "jpmorgan", "jp morgan", "citi", "citibank", "deutsche", "morgan stanley", "goldman", "amex", "american express", "mastercard", "visa", "ubs", "hsbc", "standard chartered", "nomura", "blackrock", "fidelity", "wells fargo", "bank of america", "bnp paribas"];
export const GCC_FINTECH = ["nasdaq", "fiserv", "fis", "broadridge", "paypal", "razorpay", "phonepe", "cred", "groww", "zerodha", "navi", "paytm", "stripe", "revolut", "wise"];
export const IT_SERVICES = ["accenture", "capgemini", "infosys", "tcs", "wipro", "cognizant", "hcl", "ltimindtree", "mphasis", "persistent", "deloitte", "ey", "pwc", "kpmg", "edgeverve", "finacle", "infosys bpm", "coforge", "birlasoft", "zensar", "hexaware", "nagarro", "mindtree", "tech mahindra", "virtusa"];

export const GOOD_LOCS_PRIMARY = ["mumbai", "navi mumbai", "thane", "pune"];
export const RELOCATABLE_METROS = ["bengaluru", "bangalore", "hyderabad", "gurgaon", "gurugram", "noida"];

export const FOREIGN_LOCS = [
  "united arab emirates", "uae", "dubai", "abu dhabi", "sharjah",
  "saudi arabia", "saudi", "riyadh", "jeddah",
  "qatar", "doha", "kuwait", "bahrain", "manama", "oman", "muscat",
  "singapore", "malaysia", "kuala lumpur",
  "united kingdom", "london", "united states", "germany",
  "netherlands", "amsterdam", "canada", "toronto", "australia", "sydney",
];

export const FRESH_MAX = 3;
export const AGING_MAX = 7;
export const COMP_FLOOR = 4000000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const _WORD_BOUNDARY = /(?<=^|[\s,.;:!?\-()'"])/;

function hasKw(text: string, kw: string): boolean {
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function countKw(text: string, kws: string[]): number {
  return kws.filter((k) => hasKw(text, k)).length;
}

// ─── Company tier ────────────────────────────────────────────────────────────

export function companyTier(company: string): number {
  const c = company.toLowerCase();
  if (TIER1_BFSI.some((t) => c.includes(t))) return 10;
  if (GCC_FINTECH.some((t) => c.includes(t))) return 8;
  if (IT_SERVICES.some((t) => c.includes(t))) return 6;
  return 5;
}

// ─── Location score ──────────────────────────────────────────────────────────

export function locationScore(loc: string): number {
  const l = loc.toLowerCase();
  if (FOREIGN_LOCS.some((x) => l.includes(x))) return 1;
  if (GOOD_LOCS_PRIMARY.some((x) => l.includes(x))) return 10;
  if (l.includes("remote")) return 8;
  if (l.includes("hybrid")) return 7;
  if (RELOCATABLE_METROS.some((x) => l.includes(x))) return 6;
  return 3;
}

// ─── Comp score ──────────────────────────────────────────────────────────────

export function compScore(salaryMin: number): { score: number; flag?: string } {
  if (salaryMin >= COMP_FLOOR) {
    const bonus = Math.floor((3 * (salaryMin - COMP_FLOOR)) / COMP_FLOOR);
    return { score: Math.min(18, 15 + bonus) };
  }
  if (salaryMin > 0) {
    return { score: Math.max(3, Math.floor((15 * salaryMin) / COMP_FLOOR)), flag: "below_floor" };
  }
  return { score: 8, flag: "comp_unknown" };
}

// ─── Freshness (extended with relative date parsing) ─────────────────────────

const _RE_DAYS = /\d+/;

export function freshness(posted: string): { tag: "FRESH" | "AGING" | "STALE" | "UNKNOWN"; penalty: number; ageDays: number | null } {
  if (!posted) return { tag: "UNKNOWN", penalty: -10, ageDays: null };

  const s = posted.trim();
  let age: number | null = null;

  // ISO-8601
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      age = Math.floor((Date.now() - d.getTime()) / 86400000);
    }
  } catch { /* fall through */ }

  // Plain YYYY-MM-DD
  if (age === null && /^\d{4}-\d{2}-\d{2}/.test(s)) {
    try {
      const d = new Date(s.slice(0, 10) + "T00:00:00Z");
      if (!isNaN(d.getTime())) {
        age = Math.floor((Date.now() - d.getTime()) / 86400000);
      }
    } catch { /* fall through */ }
  }

  // Relative text
  if (age === null) {
    const lower = s.toLowerCase();
    if (/just|today|now|few hours?/.test(lower)) {
      age = 0;
    } else if (/yesterday/.test(lower)) {
      age = 1;
    } else if (/week/.test(lower)) {
      const m = _RE_DAYS.exec(s);
      age = m ? parseInt(m[0]) * 7 : null;
    } else if (/month/.test(lower)) {
      const m = _RE_DAYS.exec(s);
      age = m ? parseInt(m[0]) * 30 : 99;
    } else if (/day/.test(lower)) {
      const m = _RE_DAYS.exec(s);
      age = m ? parseInt(m[0]) : null;
    }
  }

  if (age === null) return { tag: "UNKNOWN", penalty: -10, ageDays: null };
  if (age < 0) age = 0;

  if (age <= FRESH_MAX) return { tag: "FRESH", penalty: 0, ageDays: age };
  if (age <= AGING_MAX) return { tag: "AGING", penalty: -10, ageDays: age };
  return { tag: "STALE", penalty: -100, ageDays: age };
}

// ─── Canonical URL (from dedup.py) ──────────────────────────────────────────

export function canonicalUrl(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol}//${host}${path}`;
  } catch {
    return "";
  }
}

// ─── Score breakdown item ────────────────────────────────────────────────────

export interface ScoreBreakdown {
  role_match: number;
  governance: number;
  domain_fit: number;
  comp: number;
  location: number;
  org_quality: number;
  seniority_penalty?: number;
}

export interface ScoreResult {
  total: number;
  breakdown: ScoreBreakdown;
  flags: string[];
}

// ─── Main scorer ─────────────────────────────────────────────────────────────

export function scoreJob(job: {
  title: string;
  company: string;
  description: string;
  salaryMin?: number;
  location: string;
}, track: "SM" | "PM" | "DIR" = "PM"): ScoreResult {
  const title = (job.title || "").toLowerCase();
  const company = (job.company || "").toLowerCase();
  const desc = (job.description || "").toLowerCase();
  const text = `${title} ${desc}`;
  const textCo = `${text} ${company}`;
  const flags: string[] = [];

  if (desc.trim().length < 40) {
    flags.push("no_description");
  }

  const breakdown: ScoreBreakdown = {
    role_match: 0,
    governance: 0,
    domain_fit: 0,
    comp: 0,
    location: 0,
    org_quality: 0,
  };

  if (track === "PM") {
    if (SENIOR_PM_KW.some((k) => hasKw(title, k))) {
      breakdown.role_match = 23;
    } else if (hasKw(title, "program manager")) {
      breakdown.role_match = 18;
    } else if (hasKw(title, "project manager")) {
      breakdown.role_match = 15;
    } else {
      breakdown.role_match = 10;
    }
    breakdown.governance = Math.min(20, countKw(text, GOVERNANCE_KW) * 5);
    breakdown.domain_fit = Math.min(15, countKw(textCo, BFSI_KEYWORDS) * 5);
  } else if (track === "SM") {
    if (["rte", "release train", "agile coach", "enterprise agile"].some((k) => hasKw(title, k))) {
      breakdown.role_match = 25;
    } else if (["senior scrum", "lead scrum", "tribe"].some((k) => title.includes(k))) {
      breakdown.role_match = 22;
    } else if (["scrum master", "scrummaster"].some((k) => title.includes(k))) {
      breakdown.role_match = 18;
    } else {
      breakdown.role_match = 10;
    }
    breakdown.governance = Math.min(20, countKw(text, SAFE_KEYWORDS) * 7);
    breakdown.domain_fit = Math.min(15, countKw(textCo, BFSI_KEYWORDS) * 5);
  } else if (track === "DIR") {
    if (["vp", "head of", "cto", "chief"].some((k) => hasKw(title, k))) {
      breakdown.role_match = 25;
    } else if (title.includes("associate director")) {
      breakdown.role_match = 20;
    } else if (hasKw(title, "director")) {
      breakdown.role_match = 22;
    } else {
      breakdown.role_match = 10;
    }
    breakdown.governance = Math.min(20, countKw(text, SCOPE_KW) * 5);
    breakdown.domain_fit = Math.min(15, countKw(textCo, BFSI_KEYWORDS) * 5);
  }

  const cs = compScore(job.salaryMin ?? 0);
  breakdown.comp = cs.score;
  if (cs.flag) flags.push(cs.flag);

  breakdown.location = locationScore(job.location);
  breakdown.org_quality = companyTier(company);

  const neg = countKw(text, NEGATIVE_KW);
  if (neg > 0) {
    breakdown.seniority_penalty = -10 * neg;
    flags.push("junior_signal");
  }

  const rawTotal = Object.values(breakdown).reduce((a, b) => a + (b ?? 0), 0);
  return { total: rawTotal, breakdown, flags };
}

export type Track = "SM" | "PM" | "DIR";
