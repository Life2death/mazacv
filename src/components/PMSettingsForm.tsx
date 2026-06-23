"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { JobsSection } from "@/components/JobsSection";
import type { JobListing } from "@/lib/types";
import type { JobSearchDebug } from "@/lib/jobs";

const LS_KEY = "mazacv_job_settings";

interface JobSettings {
  keywords: string;
  jobTitles: string;
  location: string;
  salaryMinLPA: number;
  maxFreshnessDays: string;
}

const defaultSettings: JobSettings = {
  keywords: "",
  jobTitles: "",
  location: "",
  salaryMinLPA: 0,
  maxFreshnessDays: "",
};

export function PMSettingsForm({ accessToken, onJobsFound }: { accessToken?: string; onJobsFound?: () => void }) {
  const router = useRouter();

  const [settings, setSettings] = useState<JobSettings>(defaultSettings);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState<JobSearchDebug | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<JobSettings>;
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch {
      // ignore
    }
  }, []);

  function updateSettings(patch: Partial<JobSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    }, 500);
  }

  function authHeaders(): Record<string, string> {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }

  async function handleExtract() {
    if (!resumeFile && !resumeText.trim()) return;
    setExtracting(true);
    setExtracted(false);
    try {
      const fd = new FormData();
      if (resumeFile) fd.append("resume", resumeFile);
      if (resumeText.trim()) fd.append("resumeText", resumeText);
      const res = await fetch("/api/extract-skills", { method: "POST", body: fd, headers: authHeaders() });
      const { skills } = await res.json();
      if (skills && skills.length > 0) {
        updateSettings({ keywords: skills.join(", ") });
        setExtracted(true);
      }
    } catch {
      // silent
    } finally {
      setExtracting(false);
    }
  }

  useEffect(() => {
    if (!resumeFile && !resumeText.trim()) return;
    const timer = setTimeout(() => {
      handleExtract();
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeFile, resumeText]);

  async function handleFindJobs() {
    setError("");
    setJobs([]);
    const titlesStr = settings.jobTitles.trim();
    if (!titlesStr) {
      return setError("Kam se kam ek job title daal — 'Senior Product Manager' waise.");
    }
    const jobTitles = titlesStr.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    if (jobTitles.length === 0) {
      return setError("Kam se kam ek job title daal.");
    }

    const skills = settings.keywords
      ? settings.keywords.split(/[,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];
    const maxFreshnessDays = settings.maxFreshnessDays
      ? Number(settings.maxFreshnessDays)
      : undefined;

    setJobsLoading(true);
    setDebugInfo(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          skills,
          location: settings.location || "",
          jobTitles,
          salaryMinLPA: settings.salaryMinLPA > 0 ? settings.salaryMinLPA : undefined,
          maxFreshnessDays,
        }),
      });
      const { jobs: found, debug } = await res.json();
      setJobs(found ?? []);
      try {
        const fresh = found ?? [];
        const existing: Record<string, unknown>[] = JSON.parse(localStorage.getItem("mazacv_job_results") ?? "[]");
        const canonMap = new Map<string, Record<string, unknown>>();
        for (const j of existing) canonMap.set((j as any).canonUrl ?? (j as any).id, j);
        for (const j of fresh) {
          const key = (j as any).canonUrl ?? (j as any).id;
          const old = canonMap.get(key);
          canonMap.set(key, { ...j, applied: old?.applied ?? false, appliedDate: old?.appliedDate ?? undefined });
        }
        localStorage.setItem("mazacv_job_results", JSON.stringify(Array.from(canonMap.values())));
      } catch { /* ignore */ }
      if (debug) setDebugInfo(debug);
      if (found && found.length > 0) {
        onJobsFound?.();
        router.push("/dashboard?tab=queue");
      } else {
        setError("Koi job nahi mili — titles ya location badal ke try karo");
        setShowDebug(true);
      }
    } catch (e) {
      setError("Jobs search mein locha aa gaya — dobara try kar.");
      setDebugInfo({ query: "", location: "", adzunaCount: 0, linkedinCount: 0, totalBeforeFilter: 0, totalAfterFilter: 0, shown: 0, adzunaError: String(e) });
      setShowDebug(true);
    } finally {
      setJobsLoading(false);
    }
  }

  function handleScoreAgainst(job: JobListing) {
    if (!job.description) {
      router.push("/scan");
      return;
    }
    router.push(`/scan?jd=${encodeURIComponent(job.description)}`);
  }

  return (
    <div>
      {/* Search preferences card */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-display font-semibold">Search preferences ✏️</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700">
            Target Job Titles <span className="text-red-500">*</span>
          </label>
          <p className="mb-1 text-xs text-slate-400">Kam se kam ek title daal</p>
          <input
            type="text"
            value={settings.jobTitles}
            onChange={(e) => updateSettings({ jobTitles: e.target.value })}
            placeholder="Senior Product Manager, Product Lead"
            className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700">Location</label>
          <input
            type="text"
            value={settings.location}
            onChange={(e) => updateSettings({ location: e.target.value })}
            placeholder="Bangalore, Mumbai, Remote…"
            className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700">Skills / Keywords</label>
          <p className="mb-1 text-xs text-slate-400">Optional — resume auto-fill karega</p>
          <textarea
            value={settings.keywords}
            onChange={(e) => updateSettings({ keywords: e.target.value })}
            placeholder="Product Management, Agile, Roadmap, ..."
            className="h-24 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Min Salary</label>
            <p className="mb-1 text-xs text-slate-400">LPA mein (0 = koi bhi)</p>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">₹</span>
              <input
                type="number"
                min={0}
                value={settings.salaryMinLPA}
                onChange={(e) => updateSettings({ salaryMinLPA: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 py-3 pl-7 pr-3 text-sm focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Max Job Age</label>
            <p className="mb-1 text-xs text-slate-400">&nbsp;</p>
            <select
              value={settings.maxFreshnessDays}
              onChange={(e) => updateSettings({ maxFreshnessDays: e.target.value })}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-brand focus:outline-none"
            >
              <option value="">Any time</option>
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </div>
        </div>
      </section>

      {/* Jobs dhundo button */}
      <div className="mb-6 text-center">
        <button
          onClick={handleFindJobs}
          disabled={jobsLoading}
          className="rounded-xl bg-brand px-10 py-3.5 font-display font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark disabled:opacity-50"
        >
          {jobsLoading ? "Dhun rahe hai... 🔍" : "Jobs dhundo 🔍"}
        </button>
      </div>

      {error && (
        <p className="mx-auto mb-4 max-w-md rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">
          {error}
        </p>
      )}

      {debugInfo && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 text-xs">
          <button
            onClick={() => setShowDebug((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2 font-mono font-semibold text-slate-600 hover:text-slate-900"
          >
            <span>🔍 Debug Info {jobs.length > 0 ? `(${jobs.length} jobs found)` : "(0 jobs)"}</span>
            <span>{showDebug ? "▲ hide" : "▼ show"}</span>
          </button>
          {showDebug && (
            <div className="border-t border-slate-200 px-4 py-3 font-mono space-y-1 text-slate-700">
              <p><span className="text-slate-400">Query sent:</span> <span className="text-indigo-700 break-all">{debugInfo.query || "(empty)"}</span></p>
              <p><span className="text-slate-400">Location:</span> {debugInfo.location || "(none)"}</p>
              <hr className="border-slate-200 my-1" />
              <p>
                <span className="text-slate-400">Adzuna:</span>{" "}
                {debugInfo.adzunaError
                  ? <span className="text-red-600">Error — {debugInfo.adzunaError}</span>
                  : <span className="text-green-700">{debugInfo.adzunaCount} results{debugInfo.adzunaTotalMatches !== undefined ? ` (${debugInfo.adzunaTotalMatches} total matches on Adzuna)` : ""}</span>
                }
              </p>
              <p>
                <span className="text-slate-400">LinkedIn:</span>{" "}
                {debugInfo.linkedinError
                  ? <span className="text-red-600">Error — {debugInfo.linkedinError}</span>
                  : <span className="text-green-700">{debugInfo.linkedinCount} results</span>
                }
              </p>
              <hr className="border-slate-200 my-1" />
              <p><span className="text-slate-400">Before freshness filter:</span> {debugInfo.totalBeforeFilter}</p>
              <p><span className="text-slate-400">After freshness filter:</span> {debugInfo.totalAfterFilter}</p>
              <p><span className="text-slate-400">Shown (top 3 per source):</span> {debugInfo.shown}</p>
            </div>
          )}
        </div>
      )}

      <JobsSection jobs={jobs} loading={jobsLoading} onScoreAgainst={handleScoreAgainst} />

      {/* Resume upload at bottom */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-display font-semibold">Resume se skills nikaal (optional) 📄</h2>
        <p className="mb-3 text-xs text-slate-400">Upload ya paste kar — skills auto-fill ho jayenge</p>
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => {
            setResumeFile(e.target.files?.[0] ?? null);
            setExtracted(false);
          }}
          className="mb-3 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand/10 file:px-4 file:py-2 file:font-semibold file:text-brand"
        />
        <p className="mb-2 text-xs text-slate-400">ya paste karo</p>
        <textarea
          value={resumeText}
          onChange={(e) => { setResumeText(e.target.value); setExtracted(false); }}
          placeholder="Paste your resume text here…"
          className="h-28 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm focus:border-brand focus:outline-none"
        />
        {extracting && (
          <p className="mt-2 text-xs text-slate-400">Resume se skills nikal rahe hai... ⏳</p>
        )}
        {extracted && !extracting && (
          <p className="mt-2 text-xs font-medium text-green-600">Skills mil gayi — neeche dekh ✅</p>
        )}
      </section>
    </div>
  );
}
