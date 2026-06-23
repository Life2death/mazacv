"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/components/AuthProvider";
import { PMSettingsForm } from "@/components/PMSettingsForm";
import type { JobListing } from "@/lib/types";
import type { PipelineRun } from "@/lib/jobboard";

interface JobEntry extends JobListing {
  applied?: boolean;
  appliedDate?: string;
}

const TABS = [
  { key: "queue", label: "Jobs Queue" },
  { key: "apply", label: "Rapid Apply" },
  { key: "settings", label: "Settings" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const LS_RESULTS_KEY = "mazacv_job_results";

const FIT_LABELS: Record<string, string> = {
  role_match: "Role match",
  governance: "Governance",
  domain_fit: "Domain fit",
  comp: "Compensation",
  location: "Location",
  org_quality: "Org quality",
  seniority_penalty: "Seniority penalty",
};

function fitColor(score: number): string {
  if (score >= 60) return "#16a34a";
  if (score >= 40) return "#f59e0b";
  return "#94a3b8";
}

function freshnessStyle(tag: string): string {
  if (tag === "FRESH") return "bg-green-100 text-green-700";
  if (tag === "AGING") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-500";
}

function loadJobs(): JobEntry[] {
  try {
    const raw = localStorage.getItem(LS_RESULTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as JobEntry[];
      return parsed.map((j) => ({ ...j, canonUrl: j.canonUrl || j.id }));
    }
  } catch { /* ignore */ }
  return [];
}

function saveJobs(jobs: JobEntry[]) {
  try { localStorage.setItem(LS_RESULTS_KEY, JSON.stringify(jobs)); } catch { /* ignore */ }
}

// ─── Pipeline Banner ─────────────────────────────────────────────────────────

function PipelineBanner({ accessToken }: { accessToken?: string }) {
  const [run, setRun] = useState<PipelineRun | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [visible, setVisible] = useState(false);

  const authHeaders = useCallback((): Record<string, string> => {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }, [accessToken]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/jobboard/run-status", {
        headers: { ...authHeaders() },
      });
      if (!res.ok) return;
      const { run: latest } = await res.json();
      setRun(latest);
      if (latest && latest.status === "queued" || latest?.status === "running") {
        setVisible(true);
      }
      if (latest && (latest.status === "done" || latest.status === "error")) {
        setVisible(latest.status === "running" || latest.status === "queued");
        if (timerRef.current && (latest.status === "done" || latest.status === "error")) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          // Auto-hide after 10s
          setTimeout(() => setVisible(false), 10000);
        }
      }
    } catch { /* ignore */ }
  }, [authHeaders]);

  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, 10000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poll]);

  if (!visible || !run) return null;

  return (
    <div className={`mb-4 rounded-2xl border p-4 text-center text-sm shadow-sm ${
      run.status === "done"
        ? "border-green-200 bg-green-50 text-green-800"
        : run.status === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-indigo-200 bg-indigo-50 text-indigo-800"
    }`}>
      {run.status === "queued" && "Jobs nikal rahe hai... ⏳ (~2 min)"}
      {run.status === "running" && "Jobs nikal rahe hai... 🔄 (~2 min)"}
      {run.status === "done" && `🎉 ${run.jobsFound} nayi jobs mili!`}
      {run.status === "error" && "Pipeline mein dikkat — dobara try karo."}
      <span className="ml-2 text-xs opacity-60">
        {new Date(run.startedAt).toLocaleTimeString("en-IN")}
      </span>
    </div>
  );
}

// ─── Stats Banner ────────────────────────────────────────────────────────────

function StatsBanner({ accessToken }: { accessToken?: string }) {
  const [stats, setStats] = useState({ total: 0, applied: 0, pipeline: 0 });

  useEffect(() => {
    const all = loadJobs();
    setStats((s) => ({ ...s, total: all.length, applied: all.filter((j) => j.applied).length }));
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/jobboard/jobs?minFit=1", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((r) => r.json())
      .then(({ jobs }) => {
        if (jobs?.length > 0) setStats((s) => ({ ...s, pipeline: jobs.length }));
      })
      .catch(() => {});
  }, [accessToken]);

  return (
    <div className="mb-6 flex items-center gap-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <span className="text-lg">📊</span>
      <div className="flex gap-6 text-sm">
        <span>
          Instant search:{" "}
          <span className="font-semibold text-slate-900">{stats.total}</span>
        </span>
        <span className="text-slate-300">|</span>
        <span>
          Applied:{" "}
          <span className="font-semibold text-green-600">{stats.applied}</span>
        </span>
        <span className="text-slate-300">|</span>
        <span>
          Pipeline:{" "}
          <span className="font-semibold text-indigo-600">{stats.pipeline}</span>
        </span>
      </div>
    </div>
  );
}

// ─── Score Breakdown ─────────────────────────────────────────────────────────

function ScoreBreakdown({ scores, fitScore }: { scores: Record<string, number>; fitScore: number }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(scores).filter(([, v]) => v !== 0);
  if (entries.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[10px] font-medium text-slate-400 hover:text-slate-600"
      >
        {open ? "▲ score breakdown hide" : "▼ score breakdown show"}
      </button>
      {open && (
        <div className="mt-1 rounded-lg border border-slate-100 bg-slate-50 p-2 text-[10px]">
          {entries.map(([key, val]) => (
            <div key={key} className="flex justify-between gap-2">
              <span className="text-slate-500">{FIT_LABELS[key] ?? key}</span>
              <span className={`font-medium ${val < 0 ? "text-red-500" : "text-slate-700"}`}>
                {val > 0 ? "+" : ""}{val}
              </span>
            </div>
          ))}
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-semibold">
            <span className="text-slate-600">Total</span>
            <span style={{ color: fitColor(fitScore) }}>{fitScore}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Queue Tab ───────────────────────────────────────────────────────────────

function QueueTab({ accessToken }: { accessToken?: string }) {
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showExplainer, setShowExplainer] = useState(false);
  const [filters, setFilters] = useState({ minFit: "", portal: "", freshness: "" });
  const [pipelineJobs, setPipelineJobs] = useState<JobEntry[]>([]);

  const authHeaders = useCallback((): Record<string, string> => {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }, [accessToken]);

  const reload = useCallback(() => {
    const local = loadJobs();
    setJobs(local);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Also fetch from Supabase pipeline
  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/jobboard/jobs?minFit=1", {
      headers: { ...authHeaders() },
    })
      .then((r) => r.json())
      .then(({ jobs: piped }) => {
        if (piped?.length > 0) {
          const merged: JobEntry[] = piped.map((j: JobListing) => ({
            ...j,
            applied: false,
          }));
          setPipelineJobs(merged);
        }
      })
      .catch(() => {});
  }, [accessToken, authHeaders]);

  const allJobs = [...jobs, ...pipelineJobs].filter((j) => {
    if (filters.minFit && j.fitScore < Number(filters.minFit)) return false;
    if (filters.portal && j.portal !== filters.portal) return false;
    if (filters.freshness && j.freshnessTag !== filters.freshness) return false;
    return true;
  });

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const unapplied = allJobs.filter((j) => !j.applied);
    if (selected.size === unapplied.length && unapplied.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unapplied.map((j) => j.id)));
    }
  }

  function handleDekho(job: JobEntry) {
    const updated = jobs.map((j) =>
      j.id === job.id ? { ...j, applied: true, appliedDate: new Date().toISOString() } : j
    );
    setJobs(updated);
    saveJobs(updated);
    // Also update via API if it's a pipeline job
    if (accessToken && pipelineJobs.some((pj) => pj.id === job.id)) {
      fetch(`/api/jobboard/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: "applied" }),
      }).catch(() => {});
    }
    window.open(job.url, "_blank", "noopener,noreferrer");
  }

  function deleteSelected() {
    const remaining = jobs.filter((j) => !selected.has(j.id) || j.applied);
    setJobs(remaining);
    setSelected(new Set());
    saveJobs(remaining);
  }

  const unappliedCount = allJobs.filter((j) => !j.applied).length;

  const showEmptyState = allJobs.length === 0 && jobs.length === 0 && pipelineJobs.length === 0;

  return (
    <div className="mt-6">
      <PipelineBanner accessToken={accessToken} />

      {showEmptyState ? (
        <div className="text-center">
          <div className="text-5xl">📋</div>
          <h2 className="mt-4 font-display text-xl font-extrabold text-slate-900">
            Abhi koi jobs nahi
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Pehle Settings tab mein job titles bharo aur "Jobs dhundo" dabao.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/dashboard?tab=settings"
              className="rounded-xl bg-brand px-6 py-2.5 font-display font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
            >
              Settings mein jao ⚙️
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Filters row */}
          {allJobs.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
              <select
                value={filters.minFit}
                onChange={(e) => setFilters((f) => ({ ...f, minFit: e.target.value }))}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-slate-600"
              >
                <option value="">Min fit: any</option>
                <option value="60">≥60 strong</option>
                <option value="40">≥40 decent</option>
                <option value="0">≥0 all</option>
              </select>
              <select
                value={filters.portal}
                onChange={(e) => setFilters((f) => ({ ...f, portal: e.target.value }))}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-slate-600"
              >
                <option value="">Portal: all</option>
                <option value="Adzuna">Adzuna</option>
                <option value="LinkedIn">LinkedIn</option>
              </select>
              <select
                value={filters.freshness}
                onChange={(e) => setFilters((f) => ({ ...f, freshness: e.target.value }))}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-slate-600"
              >
                <option value="">Freshness: all</option>
                <option value="FRESH">Fresh</option>
                <option value="AGING">Aging</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
              <button
                onClick={() => setShowExplainer((v) => !v)}
                className="ml-auto text-slate-400 hover:text-slate-600"
              >
                {showExplainer ? "▲ explainer hide" : "ℹ️ explainer"}
              </button>
            </div>
          )}

          {/* Fit-score explainer panel */}
          {showExplainer && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="space-y-3 text-xs text-slate-700">
                <p className="text-slate-500">
                  Fit score job ki aapke profile se match batata hai — job ke title, company, location, salary
                  aur JD se nikaala jaata hai. Zyada score = behtar match.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-1 pr-3 text-left font-medium">Factor</th>
                        <th className="py-1 pr-3 text-left font-medium">Max</th>
                        <th className="py-1 text-left font-medium">Source</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600">
                      <tr className="border-b border-slate-100">
                        <td className="py-1 pr-3 font-medium">Role match</td>
                        <td className="py-1 pr-3">23</td>
                        <td className="py-1">Job title</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 pr-3 font-medium">Governance</td>
                        <td className="py-1 pr-3">20</td>
                        <td className="py-1">JD keywords</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 pr-3 font-medium">Domain fit</td>
                        <td className="py-1 pr-3">15</td>
                        <td className="py-1">JD + company</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 pr-3 font-medium">Compensation</td>
                        <td className="py-1 pr-3">18</td>
                        <td className="py-1">Salary listed</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 pr-3 font-medium">Location</td>
                        <td className="py-1 pr-3">10</td>
                        <td className="py-1">Job location</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 pr-3 font-medium">Org quality</td>
                        <td className="py-1 pr-3">10</td>
                        <td className="py-1">Company name</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-3 font-medium text-amber-700">Freshness penalty</td>
                        <td className="py-1 pr-3 text-amber-700">−10</td>
                        <td className="py-1 text-amber-700">AGING/UNKNOWN</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3">
                  <span><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-600 align-middle" /> ≥60 strong</span>
                  <span><span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 align-middle" /> 40–59 decent</span>
                  <span><span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400 align-middle" /> &lt;40 weak</span>
                </div>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={selected.size === unappliedCount && unappliedCount > 0}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                />
                Select all
              </label>
              <span className="text-xs text-slate-400">
                {allJobs.length} jobs · {allJobs.filter((j) => j.applied).length} applied
              </span>
            </div>
            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                className="rounded-lg bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
              >
                Delete ({selected.size})
              </button>
            )}
          </div>

          {/* Job cards */}
          <div className="space-y-3">
            {allJobs.map((job) => {
              const isApplied = job.applied;
              return (
                <div
                  key={job.id}
                  className={`rounded-2xl border bg-white p-4 shadow-sm transition ${
                    isApplied
                      ? "border-green-200 bg-green-50/30"
                      : selected.has(job.id)
                        ? "border-brand ring-1 ring-brand/20"
                        : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(job.id)}
                      onChange={() => toggle(job.id)}
                      disabled={isApplied}
                      className={`mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand focus:ring-brand ${
                        isApplied ? "cursor-not-allowed opacity-40" : ""
                      }`}
                    />
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: fitColor(job.fitScore) }}
                      >
                        {job.fitScore}
                      </div>
                      {isApplied ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                          Applied ✅
                        </span>
                      ) : (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${freshnessStyle(job.freshnessTag)}`}>
                          {job.freshnessTag}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`truncate font-semibold ${isApplied ? "text-slate-500" : "text-slate-900"}`}>
                        {job.title}
                      </h3>
                      <p className={`text-sm ${isApplied ? "text-slate-400" : "text-slate-500"}`}>{job.company}</p>
                      <p className={`text-xs ${isApplied ? "text-slate-300" : "text-slate-400"}`}>
                        {job.location}{job.salary ? ` · ${job.salary}` : ""} · {job.portal}
                        {isApplied && job.appliedDate && ` · Applied ${new Date(job.appliedDate).toLocaleDateString("en-IN")}`}
                      </p>
                      {job.scoresJson && (
                        <ScoreBreakdown scores={job.scoresJson} fitScore={job.fitScore} />
                      )}
                    </div>
                    {isApplied ? (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-200"
                      >
                        Applied ✅
                      </a>
                    ) : (
                      <button
                        onClick={() => handleDekho(job)}
                        className="shrink-0 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand/20"
                      >
                        Dekho 👀
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Apply Tab (unchanged) ───────────────────────────────────────────────────

function ApplyTab() {
  return (
    <div className="mt-6 text-center">
      <div className="text-5xl">🚀</div>
      <h2 className="mt-4 font-display text-xl font-extrabold text-slate-900">
        Queue mein jobs daal
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Jobs Queue tab mein jobs dekho, phir yahan ek ek karke apply karo.
      </p>
    </div>
  );
}

function SettingsTab({ accessToken, onJobsFound }: { accessToken?: string; onJobsFound?: () => void }) {
  return (
    <div className="mt-6">
      <PMSettingsForm accessToken={accessToken} onJobsFound={onJobsFound} />
    </div>
  );
}

function DashboardContent() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as TabKey) || "queue";

  const activeTab = TABS.find((t) => t.key === tab)?.key ?? "queue";

  function setTab(key: TabKey) {
    router.replace(`/dashboard?tab=${key}`);
  }

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [session, loading, router]);

  if (loading) return null;
  if (!session) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-slate-900">
          Dashboard
        </h1>
      </div>

      <StatsBanner accessToken={session?.access_token} />

      <div className="mt-6 border-b border-slate-200">
        <div className="flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-semibold transition border-b-2 ${
                activeTab === t.key
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "queue" && <QueueTab accessToken={session?.access_token} />}
      {activeTab === "apply" && <ApplyTab />}
      {activeTab === "settings" && <SettingsTab accessToken={session?.access_token} onJobsFound={() => setTab("queue")} />}
    </section>
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4">
      <NavBar />
      <Suspense fallback={<div className="mt-10 text-center text-sm text-slate-400">Loading...</div>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}
