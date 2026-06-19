"use client";

import type { JobListing } from "@/lib/types";

interface JobsSectionProps {
  jobs: JobListing[];
  loading: boolean;
  onScoreAgainst: (job: JobListing) => void;
}

function fitColor(score: number): string {
  if (score >= 75) return "#16a34a";
  if (score >= 45) return "#f59e0b";
  return "#ef4444";
}

function fitLabel(score: number): string {
  if (score >= 75) return "Jhakaas";
  if (score >= 45) return "Thoda aur";
  return "Locha hai";
}

function freshnessStyle(tag: string): string {
  if (tag === "FRESH") return "bg-green-100 text-green-700";
  if (tag === "AGING") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-500";
}

export function JobsSection({ jobs, loading, onScoreAgainst }: JobsSectionProps) {
  if (loading && jobs.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="mb-4 font-display text-xl font-bold text-slate-900">
          Yeh jobs tere liye 🔍
          <span className="ml-2 text-sm font-normal text-slate-400">dhun rahe hai...</span>
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
          Jobs search kar rahe hai...
        </div>
      </section>
    );
  }

  if (!loading && jobs.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="mb-4 font-display text-xl font-bold text-slate-900">
        Yeh jobs tere liye 🔍
      </h2>
      <div className="space-y-3">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900 truncate">{job.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${freshnessStyle(job.freshnessTag)}`}>
                    {job.freshnessTag}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{job.company}</p>
                <p className="text-xs text-slate-400">{job.location}</p>
                {job.salary && <p className="mt-0.5 text-xs font-medium text-slate-600">{job.salary}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: fitColor(job.fitScore) }}
                >
                  {job.fitScore}
                </div>
                <span className="text-[10px] font-semibold uppercase" style={{ color: fitColor(job.fitScore) }}>
                  {fitLabel(job.fitScore)}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {job.portal}
              </span>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-brand/10 px-3 py-1 text-xs font-medium text-brand transition hover:bg-brand/20"
              >
                Dekho 👀
              </a>
              <button
                onClick={() => onScoreAgainst(job)}
                className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Is job ke liye score nikaal
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
