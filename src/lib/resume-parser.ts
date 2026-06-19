import type { JsonResume } from "./types";
import type { Plan } from "./usage";

const SECTION_HEADERS = [
  /^(experience|work|employment|professional experience)/i,
  /^(education|academic|qualifications)/i,
  /^(skills|technical skills|core competencies|expertise)/i,
  /^(certifications|certificates|licenses)/i,
  /^(projects|personal projects|key projects)/i,
  /^(languages)/i,
  /^(summary|professional summary|profile|about me)/i,
];

/**
 * Parse resume text into JsonResume using section-based heuristics.
 * Works without any API keys — powers the free tier.
 */
export function heuristicParseResume(resumeText: string): JsonResume {
  const lines = resumeText.split(/\r?\n/);
  const sections: Record<string, string[]> = {};
  let currentSection = "header";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const matched = SECTION_HEADERS.find((re) => re.test(trimmed));
    if (matched) {
      currentSection = trimmed;
      sections[currentSection] = [];
    } else {
      if (!sections[currentSection]) sections[currentSection] = [];
      sections[currentSection].push(trimmed);
    }
  }

  const resume: JsonResume = {
    basics: { name: "", email: "" },
    skills: [],
    work: [],
    education: [],
  };

  // Header: first few non-empty lines = name, contact
  const headerLines = sections["header"] || [];
  if (headerLines.length > 0) resume.basics.name = headerLines[0];
  const headerText = headerLines.join(" ");

  const emailMatch = headerText.match(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/);
  if (emailMatch) resume.basics.email = emailMatch[0];

  const phoneMatch = headerText.match(/[\+\(]?\d[\d\s\-\(\)]{7,}\d/);
  if (phoneMatch) resume.basics.phone = phoneMatch[0].trim();

  // Summary section
  const summaryLines = findSection(sections, ["summary", "professional summary", "profile", "about me"]);
  if (summaryLines.length > 0) {
    resume.basics.summary = summaryLines.join(" ");
  }

  // Skills section
  const skillsLines = findSection(sections, ["skills", "technical skills", "core competencies", "expertise"]);
  if (skillsLines.length > 0) {
    const allSkills = skillsLines
      .join(", ")
      .split(/[,•·|;]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1);
    const techKeywords: string[] = [];
    const softKeywords: string[] = [];
    for (const sk of allSkills) {
      const lower = sk.toLowerCase();
      if (["communication", "leadership", "teamwork", "management", "problem solving", "analytical"].some((w) => lower.includes(w))) {
        softKeywords.push(sk);
      } else {
        techKeywords.push(sk);
      }
    }
    if (techKeywords.length > 0) resume.skills.push({ name: "Technical", keywords: techKeywords.slice(0, 20) });
    if (softKeywords.length > 0) resume.skills.push({ name: "Professional", keywords: softKeywords.slice(0, 10) });
  }

  // Experience section
  const expLines = findSection(sections, ["experience", "work", "employment", "professional experience"]);
  if (expLines.length > 0) {
    resume.work = parseExperienceSection(expLines);
  }

  // Education section
  const eduLines = findSection(sections, ["education", "academic", "qualifications"]);
  if (eduLines.length > 0) {
    resume.education = parseEducationSection(eduLines);
  }

  // Certifications section
  const certLines = findSection(sections, ["certifications", "certificates", "licenses"]);
  if (certLines.length > 0) {
    resume.certifications = certLines.map((l) => ({
      name: l.replace(/^[•·\-–—\s]+/, "").trim(),
    })).filter((c) => c.name.length > 2);
  }

  // Languages section
  const langLines = findSection(sections, ["languages"]);
  if (langLines.length > 0) {
    resume.languages = langLines.map((l) => {
      const parts = l.split(/[–—\-()]/).map((p) => p.trim());
      return { language: parts[0], fluency: parts[1] || "Professional" };
    });
  }

  // Projects section
  const projLines = findSection(sections, ["projects", "personal projects", "key projects"]);
  if (projLines.length > 0) {
    resume.projects = projLines.map((l) => ({
      name: l.replace(/^[•·\-–—]+/, "").trim(),
      description: "",
      highlights: [],
    }));
    if (resume.projects.length > 10) resume.projects = resume.projects.slice(0, 10);
  }

  return resume;
}

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
 * Use Claude API to parse resume text into JsonResume.
 * More accurate but requires ANTHROPIC_API_KEY.
 */
export async function claudeParseResume(resumeText: string, plan?: Plan): Promise<JsonResume> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const system = `You parse resumes into the JSON Resume schema (jsonresume.org).
Return STRICT JSON only, no markdown fences, with this shape:
{
  "basics": { "name": "", "email": "", "phone": "", "location": "", "summary": "", "headline": "" },
  "skills": [{ "name": "Technical", "keywords": ["skill1", "skill2"] }],
  "work": [{ "company": "", "position": "", "startDate": "", "endDate": "", "highlights": ["bullet1"] }],
  "education": [{ "institution": "", "area": "", "studyType": "", "startDate": "", "endDate": "" }],
  "certifications": [{ "name": "", "issuer": "" }],
  "projects": [{ "name": "", "description": "", "highlights": [] }],
  "languages": [{ "language": "", "fluency": "" }]
}
Extract EVERYTHING you can from the resume text. Be thorough.`;

  const msg = await client.messages.create({
    model: pickModel(plan),
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: truncate(resumeText, "Resume") }],
  });

  const text = msg.content
    .filter((b: any): b is any => b.type === "text")
    .map((b: any) => b.text)
    .join("");

  return parseJsonResume(text);
}

/**
 * Main entry point: tries Claude first, falls back to heuristic.
 */
export async function parseResume(resumeText: string, plan?: Plan): Promise<JsonResume> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await claudeParseResume(resumeText, plan);
    } catch {
      // Fall through to heuristic
    }
  }
  return heuristicParseResume(resumeText);
}

// --- Helpers ---

function findSection(sections: Record<string, string[]>, names: string[]): string[] {
  for (const name of names) {
    const key = Object.keys(sections).find((k) => k.toLowerCase().includes(name));
    if (key) return sections[key];
  }
  return [];
}

function parseExperienceSection(lines: string[]): JsonResume["work"] {
  const work: JsonResume["work"] = [];
  let current: JsonResume["work"][number] | null = null;

  for (const line of lines) {
    const trimmed = line.replace(/^[•·\-–—\s]+/, "").trim();
    if (!trimmed) continue;

    // Check if this line looks like a job header (Position at Company or Position, Company)
    const jobMatch = trimmed.match(/^(.+?)\s+(?:at|@|,|–|—)\s+(.+)/);
    if (jobMatch) {
      if (current) work.push(current);
      current = { company: jobMatch[2].trim(), position: jobMatch[1].trim(), startDate: "", highlights: [] };
      continue;
    }

    // Check for date pattern
    const dateMatch = trimmed.match(/(\d{4})\s*[–—]\s*(\d{4}|Present|Current|Now)/i);
    if (dateMatch && current) {
      current.startDate = dateMatch[1];
      current.endDate = dateMatch[2];
      continue;
    }

    // Otherwise it's a highlight bullet
    if (current && trimmed.length > 5) {
      current.highlights.push(trimmed);
    }
  }
  if (current) work.push(current);
  return work;
}

function parseEducationSection(lines: string[]): JsonResume["education"] {
  const education: JsonResume["education"] = [];
  let current: JsonResume["education"][number] | null = null;

  for (const line of lines) {
    const trimmed = line.replace(/^[•·\-–—\s]+/, "").trim();
    if (!trimmed) continue;

    const instMatch = trimmed.match(/^(.+?)(?:\s*[–—,]\s*|\s+-\s+)(.+)/);
    if (instMatch) {
      if (current) education.push(current);
      current = { institution: instMatch[1].trim(), area: instMatch[2].trim(), studyType: "", startDate: "" };
      continue;
    }

    const dateMatch = trimmed.match(/(\d{4})\s*[–—]\s*(\d{4}|Present)/i);
    if (dateMatch && current) {
      current.startDate = dateMatch[1];
      current.endDate = dateMatch[2];
      continue;
    }

    if (current && !current.studyType && trimmed.length < 40) {
      current.studyType = trimmed;
      continue;
    }
  }
  if (current) education.push(current);

  // Assign study type defaults
  for (const e of education) {
    if (!e.studyType) e.studyType = "Degree";
  }

  return education;
}

function parseJsonResume(text: string): JsonResume {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    return heuristicParseResume(cleaned);
  }
  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1));

    // Validate and fill defaults
    return {
      basics: {
        name: obj.basics?.name || "",
        email: obj.basics?.email || "",
        phone: obj.basics?.phone || "",
        location: obj.basics?.location || "",
        summary: obj.basics?.summary || "",
        headline: obj.basics?.headline || "",
      },
      skills: Array.isArray(obj.skills) ? obj.skills : [],
      work: Array.isArray(obj.work) ? obj.work.map((w: any) => ({
        company: w.company || "",
        position: w.position || "",
        startDate: w.startDate || "",
        endDate: w.endDate,
        highlights: Array.isArray(w.highlights) ? w.highlights : [],
      })) : [],
      education: Array.isArray(obj.education) ? obj.education.map((e: any) => ({
        institution: e.institution || "",
        area: e.area || "",
        studyType: e.studyType || "",
        startDate: e.startDate || "",
        endDate: e.endDate,
      })) : [],
      certifications: Array.isArray(obj.certifications) ? obj.certifications : undefined,
      projects: Array.isArray(obj.projects) ? obj.projects : undefined,
      languages: Array.isArray(obj.languages) ? obj.languages : undefined,
    };
  } catch {
    return heuristicParseResume(cleaned);
  }
}
