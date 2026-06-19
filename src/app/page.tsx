"use client";

import { useState } from "react";
import type { ScoreResult } from "@/lib/types";

interface ScoreResponse extends ScoreResult {
  resumeText: string;
}

interface RewriteResponse {
  resume: string;
  changes: string[];
  scoreBefore: number;
  scoreAfter: number;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jd, setJd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScoreResponse | null>(null);

  const [rewriting, setRewriting] = useState(false);
  const [rewrite, setRewrite] = useState<RewriteResponse | null>(null);

  async function handleScore() {
    setError("");
    setResult(null);
    setRewrite(null);
    if (!jd.trim()) return setError("Paste a job description first.");
    if (!file && !resumeText.trim())
      return setError("Upload a resume or paste resume text.");

    setLoading(true);
    try {
      const fd = new FormData();
      if (file) fd.append("resume", file);
      if (resumeText.trim()) fd.append("resumeText", resumeText);
      fd.append("jd", jd);
      const res = await fetch("/api/score", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scoring failed.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scoring failed.");
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-brand">MazaCV</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">
          CV banao mazedaar, naukri karo pakki.
        </p>
        <p className="mt-2 text-slate-600">
          Score your resume against any job description — free. Then let AI tailor
          it and export to PDF or Word.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">1. Your resume</h2>
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mb-3 block w-full text-sm"
          />
          <p className="mb-2 text-xs text-slate-400">or paste resume text</p>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste your resume text here…"
            className="h-40 w-full resize-y rounded-md border p-2 text-sm"
          />
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">2. Job description</h2>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here…"
            className="h-56 w-full resize-y rounded-md border p-2 text-sm"
          />
        </div>
      </section>

      <div className="mt-6 text-center">
        <button
          onClick={handleScore}
          disabled={loading}
          className="rounded-lg bg-brand px-8 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? "Scoring…" : "Score my resume"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-center text-sm text-red-700">
          {error}
        </p>
      )}

      {result && (
        <section className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">ATS Match Score</p>
              <p
                className={`text-5xl font-bold ${
                  result.score >= 70
                    ? "text-green-600"
                    : result.score >= 45
                    ? "text-amber-500"
                    : "text-red-500"
                }`}
              >
                {result.score}
                <span className="text-2xl text-slate-400">/100</span>
              </p>
            </div>
            <div className="text-sm text-slate-600">
              <p>Keyword coverage: {result.keywordCoverage}%</p>
              <p>Content similarity: {result.similarity}%</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-red-600">
                Missing keywords ({result.missingKeywords.length})
              </h3>
              <div className="flex flex-wrap gap-1">
                {result.missingKeywords.map((k) => (
                  <span
                    key={k}
                    className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-green-600">
                Matched keywords ({result.matchedKeywords.length})
              </h3>
              <div className="flex flex-wrap gap-1">
                {result.matchedKeywords.map((k) => (
                  <span
                    key={k}
                    className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {result.warnings.length > 0 && (
            <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              <p className="mb-1 font-semibold">Format tips</p>
              <ul className="list-inside list-disc">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 border-t pt-5">
            <button
              onClick={handleRewrite}
              disabled={rewriting}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {rewriting ? "Tailoring with AI…" : "✨ Improve my resume with AI"}
            </button>
            <span className="ml-3 text-xs text-slate-400">
              AI rewrite is a Pro feature in production.
            </span>
          </div>
        </section>
      )}

      {rewrite && (
        <section className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-4">
            <h2 className="font-semibold">AI-tailored resume</h2>
            <span className="text-sm text-slate-500">
              Score {rewrite.scoreBefore} →{" "}
              <span className="font-semibold text-green-600">
                {rewrite.scoreAfter}
              </span>
            </span>
          </div>

          {rewrite.changes.length > 0 && (
            <ul className="mb-4 list-inside list-disc rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              {rewrite.changes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}

          <textarea
            readOnly
            value={rewrite.resume}
            className="h-96 w-full resize-y rounded-md border bg-slate-50 p-3 font-mono text-xs"
          />

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => handleExport("pdf")}
              className="rounded-lg border px-5 py-2 font-medium hover:bg-slate-50"
            >
              ⬇ Download PDF
            </button>
            <button
              onClick={() => handleExport("docx")}
              className="rounded-lg border px-5 py-2 font-medium hover:bg-slate-50"
            >
              ⬇ Download Word
            </button>
          </div>
        </section>
      )}

      <footer className="mt-12 text-center text-xs text-slate-400">
        Free unlimited scoring · AI tailoring & export on Pro · Banaya Mumbai mein ❤️ · mazacv.in
      </footer>
    </main>
  );
}
