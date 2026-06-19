"use client";

import { useState } from "react";
import type { ScoreResult, Portal } from "@/lib/types";

interface ScoreResponse extends ScoreResult {
  resumeText: string;
}

interface RewriteResponse {
  resume: string;
  changes: string[];
  scoreBefore: number;
  scoreAfter: number;
}

/** Hinglish reaction + colour band for a score. */
function reaction(score: number) {
  if (score >= 75)
    return {
      title: "Jhakaas! 🔥",
      sub: "Tera resume ekdum fit hai — apply with confidence",
      color: "#16a34a",
      track: "#e8f5ee",
    };
  if (score >= 45)
    return {
      title: "Thoda aur mehnat, boss.",
      sub: "Banta hai — a few tweaks aur scene set ho jayega",
      color: "#f59e0b",
      track: "#fef3c7",
    };
  return {
    title: "Locha hai!",
    sub: "Chal AI se theek karte hai — tension nahi lene ka",
    color: "#ef4444",
    track: "#fee2e2",
  };
}

function Gauge({ score }: { score: number }) {
  const r = reaction(score);
  const deg = Math.round((score / 100) * 360);
  return (
    <div
      style={{
        background: `conic-gradient(${r.color} ${deg}deg, ${r.track} 0)`,
      }}
      className="relative mx-auto mt-4 h-40 w-40 rounded-full"
    >
      <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
        <div
          className="font-display text-5xl font-extrabold leading-none"
          style={{ color: r.color }}
        >
          {score}
        </div>
        <div className="text-xs font-semibold text-slate-400">/ 100</div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand shadow-lg shadow-brand/30">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="text-left">
        <div className="font-display text-3xl font-extrabold leading-none text-slate-900">
          Maza<span className="text-brand">CV</span>
        </div>
        <div className="mt-1 text-sm font-semibold text-amber-brand">
          CV banao mazedaar.
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jd, setJd] = useState("");
  const [portal, setPortal] = useState<Portal>("generic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScoreResponse | null>(null);

  const [rewriting, setRewriting] = useState(false);
  const [rewrite, setRewrite] = useState<RewriteResponse | null>(null);

  async function handleScore() {
    setError("");
    setResult(null);
    setRewrite(null);
    if (!jd.trim()) return setError("JD yahan paste maar — job description is required.");
    if (!file && !resumeText.trim())
      return setError("Apna resume daal — upload a file or paste text.");

    setLoading(true);
    try {
      const fd = new FormData();
      if (file) fd.append("resume", file);
      if (resumeText.trim()) fd.append("resumeText", resumeText);
      fd.append("jd", jd);
      fd.append("portal", portal);
      const res = await fetch("/api/score", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scoring failed.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Arre, kuch locha ho gaya. Phirse try kar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRewrite() {
    if (!result) return;
    setError("");
    setRewriting(true);
    try {
      const res = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: result.resumeText, jd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rewrite failed.");
      setRewrite(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rewrite failed.");
    } finally {
      setRewriting(false);
    }
  }

  async function handleExport(format: "pdf" | "docx") {
    const text = rewrite?.resume ?? result?.resumeText;
    if (!text) return;
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText: text, format }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error || "Export failed.");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const r = result ? reaction(result.score) : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-col items-center text-center">
        <Logo />
        <p className="mt-4 max-w-md text-slate-600">
          Score your resume against any job description — free. Then let AI tailor
          it and export to PDF or Word.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 font-display font-semibold">Apna resume idhar daal 📄</h2>
          <p className="mb-3 text-xs text-slate-400">Upload PDF, Word or paste text</p>
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mb-3 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand/10 file:px-4 file:py-2 file:font-semibold file:text-brand"
          />
          <p className="mb-2 text-xs text-slate-400">ya paste karo</p>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume text here…"
            className="h-40 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm focus:border-brand focus:outline-none"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 font-display font-semibold">JD yahan paste maar</h2>
          <p className="mb-3 text-xs text-slate-400">Paste the full job description</p>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here…"
            className="h-40 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm focus:border-brand focus:outline-none"
          />
          <label className="mt-3 block text-xs font-medium text-slate-500">
            Target portal
          </label>
          <select
            value={portal}
            onChange={(e) => setPortal(e.target.value as Portal)}
            className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-brand focus:outline-none"
          >
            <option value="generic">Generic — koi bhi job</option>
            <option value="naukri">Naukri.com</option>
            <option value="linkedin_india">LinkedIn India</option>
          </select>
        </div>
      </section>

      <div className="mt-6 text-center">
        <button
          onClick={handleScore}
          disabled={loading}
          className="rounded-xl bg-brand px-10 py-3.5 font-display font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? "Ruk, calculate kar raha hu… ⏳" : "Score nikaal!"}
        </button>
      </div>

      {error && (
        <p className="mx-auto mt-4 max-w-md rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">
          {error}
        </p>
      )}

      {result && r && (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* reaction + gauge */}
          <div className="text-center">
            <div
              className="font-display text-2xl font-extrabold"
              style={{ color: r.color }}
            >
              {r.title}
            </div>
            <div className="mt-0.5 text-sm text-slate-500">{r.sub}</div>
            <Gauge score={result.score} />

            {/* Sub-scores grid */}
            <div className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-3 text-left">
              {[
                { label: "Hard Skills", value: result.subScores.hardSkills, color: "bg-indigo-500" },
                { label: "Soft Skills", value: result.subScores.softSkills, color: "bg-amber-500" },
                { label: "Searchability", value: result.subScores.searchability, color: "bg-green-500" },
                { label: "Format Health", value: result.subScores.formatHealth, color: "bg-slate-500" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-medium text-slate-600">{s.label}</span>
                    {s.value !== null ? (
                      <span className="font-semibold text-slate-800">{s.value}%</span>
                    ) : (
                      <span className="font-medium text-slate-300">—</span>
                    )}
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    {s.value !== null ? (
                      <div
                        className={`h-full rounded-full ${s.color} transition-all`}
                        style={{ width: `${s.value}%` }}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* matched */}
          <div className="mb-2 mt-6 text-sm font-semibold text-slate-900">
            Yeh already mast hai ✅
          </div>
          <div className="flex flex-wrap gap-2">
            {result.matchedKeywords.map((k) => (
              <span
                key={k}
                className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800"
              >
                ✓ {k}
              </span>
            ))}
            {result.matchedKeywords.length === 0 && (
              <span className="text-xs text-slate-400">Abhi koi match nahi mila.</span>
            )}
          </div>

          {/* missing */}
          <div className="mb-2 mt-5 text-sm font-semibold text-slate-900">
            Yeh shabd missing hai — daalna padega
          </div>
          <div className="flex flex-wrap gap-2">
            {result.missingKeywords.map((k) => (
              <span
                key={k}
                className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800"
              >
                + {k}
              </span>
            ))}
            {result.missingKeywords.length === 0 && (
              <span className="text-xs text-slate-400">Sab cover ho gaya — bindaas!</span>
            )}
          </div>

          {/* format tips */}
          {result.warnings.length > 0 && (
            <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <span className="text-base">💡</span>
              <div>
                <div className="text-sm font-semibold text-amber-800">Format tips</div>
                <ul className="mt-1 list-inside list-disc text-xs leading-relaxed text-amber-700">
                  {result.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* AI CTA */}
          <div className="mt-6">
            <button
              onClick={handleRewrite}
              disabled={rewriting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-brand py-3.5 font-display font-semibold text-slate-800 transition hover:brightness-95 disabled:opacity-50"
            >
              {rewriting ? "Apun ka AI kaam pe laga hai…" : "AI se sahi karwa lelo ✨"}
              <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-white">
                PRO
              </span>
            </button>
          </div>
        </section>
      )}

      {rewrite && (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="font-display font-semibold">Ho gaya boss! Score upar gaya 📈</h2>
            <span className="text-sm text-slate-500">
              {rewrite.scoreBefore} →{" "}
              <span className="font-semibold text-green-600">{rewrite.scoreAfter}</span>
            </span>
          </div>

          {rewrite.changes.length > 0 && (
            <ul className="mb-4 list-inside list-disc rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              {rewrite.changes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}

          <textarea
            readOnly
            value={rewrite.resume}
            className="h-96 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => handleExport("pdf")}
              className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold transition hover:bg-slate-50"
            >
              PDF download kar lelo
            </button>
            <button
              onClick={() => handleExport("docx")}
              className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold transition hover:bg-slate-50"
            >
              Word mein le ja
            </button>
          </div>
        </section>
      )}

      <footer className="mt-12 text-center text-xs text-slate-400">
        Free unlimited scoring · AI tailoring &amp; export on Pro · Banaya Mumbai mein ❤️ ·
        mazacv.in
      </footer>
    </main>
  );
}
