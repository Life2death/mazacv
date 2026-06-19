"use client";

import { useState, useEffect } from "react";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/components/AuthProvider";
import { UpgradeModal } from "@/components/UpgradeModal";
import type { ScoreResult, Portal, CoverLetterResult, TemplateId, JsonResume } from "@/lib/types";

interface ScoreResponse extends ScoreResult {
  resumeText: string;
  parsedResume: JsonResume;
  remaining?: number;
}

interface RewriteResponse {
  resume: string;
  changes: string[];
  scoreBefore: number;
  scoreAfter: number;
  parsedResume: JsonResume;
  remaining?: number;
}

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
      style={{ background: `conic-gradient(${r.color} ${deg}deg, ${r.track} 0)` }}
      className="relative mx-auto mt-4 h-40 w-40 rounded-full"
    >
      <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
        <div className="font-display text-5xl font-extrabold leading-none" style={{ color: r.color }}>
          {score}
        </div>
        <div className="text-xs font-semibold text-slate-400">/ 100</div>
      </div>
    </div>
  );
}

export default function ScanPage() {
  const { session } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jd, setJd] = useState("");
  const [portal, setPortal] = useState<Portal>("generic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScoreResponse | null>(null);

  const [rewriting, setRewriting] = useState(false);
  const [rewrite, setRewrite] = useState<RewriteResponse | null>(null);

  const [generatingCover, setGeneratingCover] = useState(false);
  const [coverLetter, setCoverLetter] = useState<CoverLetterResult | null>(null);
  const [parsedResume, setParsedResume] = useState<JsonResume | null>(null);

  const [scoresLeft, setScoresLeft] = useState<number | null>(null);
  const [rewritesLeft, setRewritesLeft] = useState<number | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");
  const [scanId, setScanId] = useState<string | null>(null);

  // Load scan from history (?id=xxx)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/scans/${id}`, {
          headers: authHeaders(),
        });
        if (!res.ok) return;
        const { scan } = await res.json();
        if (!scan) return;
        setJd(scan.jd);
        setResumeText(scan.resume_text);
        setPortal(scan.portal);
        setScanId(scan.id);
        // If the scan has a score, restore result state too
        if (scan.score !== undefined) {
          setResult({
            score: scan.score,
            similarity: 0,
            keywordCoverage: 0,
            matchedKeywords: [],
            missingKeywords: [],
            warnings: [],
            subScores: scan.sub_scores ?? {
              hardSkills: null,
              softSkills: null,
              searchability: 0,
              formatHealth: 0,
            },
            impact: { impactScore: 0, metricsFound: 0, strongVerbs: [], weakPhrases: [], cliches: [] },
            resumeText: scan.resume_text,
            parsedResume: { basics: { name: "", email: "" }, skills: [], work: [], education: [] },
          });
        }
      } catch {
        // Silently fail — user can still use the form
      }
    })();
  }, []);

  const [templateId, setTemplateId] = useState<TemplateId>("classic");
  const [accentColor, setAccentColor] = useState("#4f46e5");
  const TEMPLATES = [
    { id: "classic" as TemplateId, name: "Classic", tier: "ATS-Safe", desc: "Single column, serif" },
    { id: "modern" as TemplateId, name: "Modern", tier: "ATS-Safe", desc: "Sans-serif with accent bar" },
    { id: "compact" as TemplateId, name: "Compact", tier: "ATS-Safe", desc: "Tight spacing, 1 page" },
    { id: "minimal" as TemplateId, name: "Minimal", tier: "ATS-Safe", desc: "Ultra-compact, small font" },
    { id: "professional" as TemplateId, name: "Professional", tier: "ATS-Safe", desc: "Numbered sections, labels" },
    { id: "split" as TemplateId, name: "Split", tier: "Designer", desc: "Two-column with sidebar" },
    { id: "fresher" as TemplateId, name: "Fresher", tier: "ATS-Safe", desc: "Education-first, projects focus" },
    { id: "technical" as TemplateId, name: "Technical", tier: "ATS-Safe", desc: "Skills-first, tech badges" },
    { id: "career-switcher" as TemplateId, name: "Career Switcher", tier: "ATS-Safe", desc: "Transferable skills format" },
  ] as const;
  const ACCENT_COLORS = [
    { name: "Indigo", value: "#4f46e5" },
    { name: "Amber", value: "#f59e0b" },
    { name: "Green", value: "#16a34a" },
    { name: "Teal", value: "#0d9488" },
    { name: "Rose", value: "#e11d48" },
    { name: "Slate", value: "#475569" },
  ] as const;

  function authHeaders(): Record<string, string> {
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function handleScore() {
    setError("");
    setResult(null);
    setRewrite(null);
    setCoverLetter(null);
    setParsedResume(null);
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
      const res = await fetch("/api/score", { method: "POST", body: fd, headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) { setUpgradeReason(data.error || ""); setShowUpgradeModal(true); return; }
        throw new Error(data.error || "Scoring failed.");
      }
      setResult(data);
      setParsedResume(data.parsedResume);
      if (typeof data.remaining === "number") setScoresLeft(data.remaining);

      // Auto-save scan to history
      try {
        const scanRes = await fetch("/api/scans", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ jd, resumeText: data.resumeText, score: data.score, subScores: data.subScores, impact: data.impact, portal }),
        });
        if (scanRes.ok) {
          const { scan } = await scanRes.json();
          if (scan?.id) setScanId(scan.id);
        }
      } catch { /* silent */ }
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
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ resumeText: result.resumeText, jd }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) { setUpgradeReason(data.error || ""); setShowUpgradeModal(true); return; }
        throw new Error(data.error || "Rewrite failed.");
      }
      setRewrite(data);
      setParsedResume(data.parsedResume);
      if (typeof data.remaining === "number") setRewritesLeft(data.remaining);

      // Update scan with rewritten text
      if (scanId) {
        try {
          await fetch(`/api/scans/${scanId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ rewritten_text: data.resume }),
          });
        } catch { /* silent */ }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rewrite failed.");
    } finally {
      setRewriting(false);
    }
  }

  async function handleGenerateCover() {
    if (!result) return;
    setError("");
    setGeneratingCover(true);
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ resumeText: result.resumeText, jd }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) { setUpgradeReason(data.error || ""); setShowUpgradeModal(true); return; }
        throw new Error(data.error || "Cover letter generation failed.");
      }
      setCoverLetter(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cover letter generation failed.");
    } finally {
      setGeneratingCover(false);
    }
  }

  async function handleCopyCover() {
    if (!coverLetter?.coverLetter) return;
    try {
      await navigator.clipboard.writeText(coverLetter.coverLetter);
    } catch {
      // Fallback
    }
  }

  async function handleExport(
    format: "pdf" | "docx",
    textOverride?: string,
    opts?: { isCoverLetter?: boolean }
  ) {
    const text = textOverride ?? rewrite?.resume ?? result?.resumeText;
    if (!text) return;
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        resumeText: text,
        parsedResume,
        format,
        templateId,
        accentColor,
        isCoverLetter: opts?.isCoverLetter ?? !!textOverride,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 402) { setUpgradeReason(data.error || ""); setShowUpgradeModal(true); return; }
      return setError(data.error || "Export failed.");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = textOverride ? `cover-letter.${format}` : `resume.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const r = result ? reaction(result.score) : null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <NavBar showLinks={false} />
      <div className="mb-8 text-center">
        <p className="mx-auto max-w-md text-slate-600">
          Score your resume against any job description — free. Then let AI tailor
          it and export to PDF or Word.
        </p>
        {scoresLeft !== null && scoresLeft < 3 && (
          <div className="mt-3 flex items-center justify-center gap-4 text-xs">
            <span className={`rounded-full px-3 py-1 font-medium ${
              scoresLeft > 0
                ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-700"
            }`}>
              {scoresLeft > 0
                ? `${scoresLeft} free score${scoresLeft !== 1 ? "s" : ""} left aaj ke liye`
                : "Free limit khatam! 😅"}
            </span>
            {rewritesLeft !== null && rewritesLeft < 1 && (
              <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700">
                {rewritesLeft > 0
                  ? `${rewritesLeft} rewrite left`
                  : "No rewrites left"}
              </span>
            )}
          </div>
        )}
      </div>

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
          <div className="text-center">
            <div className="font-display text-2xl font-extrabold" style={{ color: r.color }}>
              {r.title}
            </div>
            <div className="mt-0.5 text-sm text-slate-500">{r.sub}</div>
            <div className="mx-auto mt-4 flex max-w-md items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-xs font-semibold text-slate-500">ATS Score</div>
                <Gauge score={result.score} />
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold text-slate-500">Impact Score</div>
                <Gauge score={result.impact.impactScore} />
              </div>
            </div>

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

            {/* Impact score breakdown */}
            <div className="mx-auto mt-5 max-w-sm rounded-xl bg-blue-50 p-3 text-left text-xs">
              <div className="mb-1.5 text-xs font-semibold text-blue-800">Impact Breakdown</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-blue-700">
                <span>📊 {result.impact.metricsFound} metrics</span>
                <span>💪 {result.impact.strongVerbs.length} strong verbs</span>
              </div>
              {result.impact.weakPhrases.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1 text-amber-700">
                  <span className="font-medium">⚠️ Weak:</span>
                  {result.impact.weakPhrases.map((w, i) => (
                    <span key={i} className="rounded bg-amber-100 px-1.5">"{w}"</span>
                  ))}
                </div>
              )}
              {result.impact.cliches.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1 text-red-600">
                  <span className="font-medium">🚫 Clichés:</span>
                  {result.impact.cliches.map((c, i) => (
                    <span key={i} className="rounded bg-red-100 px-1.5">"{c}"</span>
                  ))}
                </div>
              )}
            </div>
          </div>

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

          <div className="mt-6 flex flex-col gap-3">
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
            <button
              onClick={handleGenerateCover}
              disabled={generatingCover}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand/30 py-3.5 font-display font-semibold text-brand transition hover:bg-brand/5 disabled:opacity-50"
            >
              {generatingCover ? "Cover letter bana raha hu…" : "Cover letter bhi bana do 😏"}
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

          {rewrite.resume.split(/\s+/).length > 800 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              ⚠️ Resume bahut lamba hai — 2 page se zyada ho sakta hai. Trim kar lo, boss!
            </div>
          )}

          <div className="mt-5">
            <div className="mb-2 text-xs font-semibold text-slate-500">Resume template</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  className={`shrink-0 rounded-xl border-2 p-3 text-left transition ${
                    templateId === t.id
                      ? "border-brand bg-brand/5"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-800">{t.name}</div>
                  <div className={`mt-0.5 text-[10px] font-semibold uppercase ${
                    t.tier === "ATS-Safe" ? "text-green-600" : "text-amber-600"
                  }`}>{t.tier}</div>
                  <div className="mt-0.5 text-[10px] text-slate-400">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-xs font-semibold text-slate-500">Accent colour</div>
            <div className="flex gap-2">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setAccentColor(c.value)}
                  className={`h-7 w-7 rounded-full border-2 transition ${
                    accentColor === c.value ? "border-slate-800 scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => handleExport("pdf")}
              className="rounded-xl bg-brand px-5 py-2.5 font-semibold text-white transition hover:bg-brand-dark"
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

      {coverLetter && (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-display font-semibold">Cover letter ready hai boss! 💌</h2>

          {coverLetter.changes.length > 0 && (
            <ul className="mb-4 mt-2 list-inside list-disc rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              {coverLetter.changes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}

          <textarea
            readOnly
            value={coverLetter.coverLetter}
            className="mt-3 h-48 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleCopyCover}
              className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold transition hover:bg-slate-50"
            >
              Copy karo 📋
            </button>
            <button
              onClick={() => handleExport("pdf", coverLetter.coverLetter, { isCoverLetter: true })}
              className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold transition hover:bg-slate-50"
            >
              PDF download kar lelo
            </button>
            <button
              onClick={() => handleExport("docx", coverLetter.coverLetter, { isCoverLetter: true })}
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

      <UpgradeModal
        open={showUpgradeModal}
        reason={upgradeReason}
        onClose={() => setShowUpgradeModal(false)}
      />
    </main>
  );
}
