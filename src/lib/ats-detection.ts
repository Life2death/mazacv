const ATS_PATTERNS: [string, string][] = [
  ["greenhouse.io", "Greenhouse"],
  ["lever.co", "Lever"],
  ["ashbyhq.com", "Ashby"],
  ["workday.com", "Workday"],
  ["myworkdayjobs.com", "Workday"],
  ["bamboohr.com", "BambooHR"],
  ["smartrecruiters.com", "SmartRecruiters"],
  ["icims.com", "iCIMS"],
  ["jobvite.com", "Jobvite"],
  ["linkedin.com/jobs", "LinkedIn Easy Apply"],
  ["linkedin.com", "LinkedIn"],
  ["naukri.com", "Naukri"],
  ["indeed.com", "Indeed"],
  ["wellfound.com", "Wellfound (AngelList)"],
  ["angel.co", "AngelList"],
  ["dice.com", "Dice"],
  ["monster.com", "Monster"],
  ["glassdoor.com/job", "Glassdoor"],
  ["glassdoor.co.in/job", "Glassdoor"],
  ["recruitee.com", "Recruitee"],
  ["teamtailor.com", "Teamtailor"],
  ["pinpointhq.com", "Pinpoint"],
  ["zoho.com/recruit", "Zoho Recruit"],
  ["gohire.io", "GoHire"],
  ["freshteam.com", "Freshteam"],
  ["appcast.io", "Appcast"],
  ["breezy.hr", "Breezy HR"],
  ["breezyhr.com", "Breezy HR"],
  ["jazzhr.com", "JazzHR"],
  ["jazz.co", "JazzHR"],
  ["workable.com", "Workable"],
  ["personio.de", "Personio"],
  ["personio.com", "Personio"],
  ["comeet.com", "Comeet"],
];

export function detectAts(url: string): string | null {
  try {
    const lower = url.toLowerCase();
    for (const [pattern, name] of ATS_PATTERNS) {
      if (lower.includes(pattern)) return name;
    }
    // Try parsing as URL to catch edge cases
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace("www.", "");
    for (const [pattern, name] of ATS_PATTERNS) {
      if (hostname.includes(pattern) || `${hostname}${parsed.pathname}`.includes(pattern)) {
        return name;
      }
    }
  } catch {
    // Not a valid URL — return null
  }
  return null;
}

export function extractUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = urlRegex.exec(text);
  return match ? match[1] : null;
}
