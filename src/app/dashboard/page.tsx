"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/components/AuthProvider";
import { PMSettingsForm } from "@/components/PMSettingsForm";
import type { JobListing } from "@/lib/types";

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

function StatsBanner() {
  const [stats, setStats] = useState({ total: 0, applied: 0 });

  useEffect(() => {
    const all = loadJobs();
    setStats({ total: all.length, applied: all.filter((j) => j.applied).length });
  }, []);

  return (
    <div className="mb-6 flex items-center gap-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <span className="text-lg">📊</span>
      <div className="flex gap-6 text-sm">
        <span>
          Total jobs:{" "}
          <span className="font-semibold text-slate-900">{stats.total}</span>
        </span>
        <span className="text-slate-300">|</span>
        <span>
          Applied:{" "}
          <span className="font-semibold text-green-600">{stats.applied}</span>
        </span>
      </div>
    </div>
  );
}

function QueueTab() {
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const reload = useCallback(() => { setJobs(loadJobs()); }, []);

  useEffect(() => { reload(); }, [reload]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === jobs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(jobs.map((j) => j.id)));
    }
  }

  function handleDekho(job: JobEntry) {
    const updated = jobs.map((j) =>
      j.id === job.id ? { ...j, applied: true, appliedDate: new Date().toISOString() } : j
    );
    setJobs(updated);
    saveJobs(updated);
    window.open(job.url, "_blank", "noopener,noreferrer");
  }

  function deleteSelected() {
    const remaining = jobs.filter((j) => !selected.has(j.id) || j.applied);
    setJobs(remaining);
    setSelected(new Set());
    saveJobs(remaining);
  }

  const unappliedCount = jobs.filter((j) => !j.applied).length;

  if (jobs.length === 0) {
    return (
      <div className="mt-6 text-center">
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
    );
  }

  return (
    <div className="mt-6">
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
            {jobs.length} jobs · {jobs.filter((j) => j.applied).length} applied
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

      <div className="space-y-3">
        {jobs.map((job) => {
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
    </div>
  );
}

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

      <StatsBanner />

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

      {activeTab === "queue" && <QueueTab />}
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
