"use client";

import { useState } from "react";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/components/AuthProvider";
import { UpgradeModal } from "@/components/UpgradeModal";

interface OptimizeResult {
  headline: string;
  summary: string;
  skillsToAdd: string[];
  skillsToRemove: string[];
  suggestions: string[];
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
}

export default function LinkedInPage() {
  const { session } = useAuth();
  const [about, setAbout] = useState("");
  const [experience, setExperience] = useState("");
  const [targetJd, setTargetJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  function authHeaders(): Record<string, string> {
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function handleOptimize() {
    if (!targetJd.trim()) return setError("Target job description daal na, boss!");
    if (!about.trim() && !experience.trim()) return setError("LinkedIn About ya Experience to daal do!");
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/linkedin-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ about, experience, targetJd }),
      });
      const data = await res.json();
      if (res.status === 403) { setUpgradeReason(data.error || ""); setShowUpgrade(true); return; }
      if (!res.ok) throw new Error(data.error || "Optimization failed.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kuch locha ho gaya.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10">
      <NavBar />
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl font-extrabold text-slate-900">
          LinkedIn Optimizer 🔗
        </h1>
        <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">
          Paste your LinkedIn profile + target role — AI suggeste headline, summary,
          aur skills improvements.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-display font-semibold">Apna LinkedIn daal</h2>
          <p className="mb-4 text-xs text-slate-400">About + Experience + Target role</p>

          <label className="mb-1 block text-xs font-semibold text-slate-500">About section</label>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Copy-paste your LinkedIn About section here..."
            rows={5}
            className="mb-4 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
          />

          <label className="mb-1 block text-xs font-semibold text-slate-500">Experience</label>
          <textarea
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder="Paste your experience section (job titles, companies, descriptions)..."
            rows={6}
            className="mb-4 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
          />

          <label className="mb-1 block text-xs font-semibold text-slate-500">Target job description</label>
          <textarea
            value={targetJd}
            onChange={(e) => setTargetJd(e.target.value)}
            placeholder="Paste the job description you're targeting..."
            rows={5}
            className="mb-4 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
          />

          <button
            onClick={handleOptimize}
            disabled={loading}
            className="w-full rounded-xl bg-brand px-5 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {loading ? "Optimize ho raha hai…" : "Optimize karo 🚀"}
          </button>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">{error}</p>
          )}
        </section>

        <section className="space-y-4">
          {result && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-green-700">Results</h2>
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    ATS Score: {result.score}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-1 text-xs font-semibold text-slate-500">Optimized Headline</h3>
                <p className="rounded-xl bg-brand/5 p-3 text-sm font-medium text-slate-800">
                  {result.headline}
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(result.headline)}
                  className="mt-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50"
                >
                  Copy headline 📋
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-1 text-xs font-semibold text-slate-500">Optimized Summary</h3>
                <textarea
                  readOnly
                  value={result.summary}
                  className="h-36 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(result.summary)}
                  className="mt-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50"
                >
                  Copy summary 📋
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-2 text-xs font-semibold text-slate-500">Skills to add</h3>
                <div className="flex flex-wrap gap-2">
                  {result.skillsToAdd.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
                    >
                      + {skill}
                    </span>
                  ))}
                  {result.skillsToAdd.length === 0 && (
                    <span className="text-xs text-slate-400">No suggestions</span>
                  )}
                </div>
                <h3 className="mb-2 mt-4 text-xs font-semibold text-slate-500">Skills to remove</h3>
                <div className="flex flex-wrap gap-2">
                  {result.skillsToRemove.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600"
                    >
                      - {skill}
                    </span>
                  ))}
                  {result.skillsToRemove.length === 0 && (
                    <span className="text-xs text-slate-400">No suggestions</span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-2 text-xs font-semibold text-slate-500">Suggestions</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
                  {result.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              {result.missingKeywords.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-2 text-xs font-semibold text-slate-500">Missing keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.missingKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!result && !loading && (
            <div className="flex h-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
              <div>
                <div className="text-4xl">📝</div>
                <p className="mt-2 text-sm text-slate-400">
                  Results yahan dikhenge — apna LinkedIn daal aur Optimize dabao
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <UpgradeModal
        open={showUpgrade}
        reason={upgradeReason}
        onClose={() => setShowUpgrade(false)}
      />
    </main>
  );
}
