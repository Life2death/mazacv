"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/components/AuthProvider";
import { UpgradeModal } from "@/components/UpgradeModal";

interface Scan {
  id: string;
  jd: string;
  resume_text: string;
  score: number;
  sub_scores: Record<string, number | null> | null;
  portal: string;
  rewritten_text: string | null;
  created_at: string;
}

interface ResumePageInfo {
  slug: string;
  scan_id: string;
  published: boolean;
  created_at: string;
}

export default function HistoryPage() {
  const { user, session } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [pages, setPages] = useState<Map<string, ResumePageInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const headers: Record<string, string> = {};
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

    (async () => {
      try {
        const [scansRes, pagesRes] = await Promise.all([
          fetch("/api/scans", { headers }),
          fetch("/api/resume-pages", { headers }),
        ]);
        const scansData = await scansRes.json();
        const pagesData = await pagesRes.json();
        setScans(scansData.scans ?? []);
        const map = new Map<string, ResumePageInfo>();
        for (const p of pagesData.pages ?? []) {
          map.set(p.scan_id, p);
        }
        setPages(map);
      } catch {
        setError("Kuch locha ho gaya. Phirse try kar.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, session]);

  async function handleDelete(id: string) {
    if (!confirm("Yeh scan delete ho jayega. Pakka?")) return;
    setDeleting(id);
    const headers: Record<string, string> = {};
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
    try {
      const res = await fetch(`/api/scans/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error();
      setScans((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setError("Delete nahi ho paya. Phirse try kar.");
    } finally {
      setDeleting(null);
    }
  }

  async function handleTogglePublish(scanId: string, pageInfo: ResumePageInfo | undefined) {
    setToggling(scanId);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
    try {
      if (pageInfo) {
        const res = await fetch(`/api/resume-pages/${pageInfo.slug}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ published: !pageInfo.published }),
        });
        if (!res.ok) throw new Error();
        setPages((prev) => {
          const next = new Map(prev);
          const existing = next.get(scanId);
          if (existing) next.set(scanId, { ...existing, published: !existing.published });
          return next;
        });
      }
    } catch {
      setError("Toggle nahi ho paya.");
    } finally {
      setToggling(null);
    }
  }

  function scoreColor(score: number) {
    if (score >= 75) return "text-green-600";
    if (score >= 45) return "text-amber-600";
    return "text-red-500";
  }

  if (!user) {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-4">
        <NavBar />
        <section className="flex flex-1 flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl">🔒</div>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-slate-900">
            Login karo, boss!
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            History sirf logged-in users ke liye hai.
          </p>
          <Link
            href="/login"
            className="mt-6 rounded-xl bg-brand px-8 py-3 font-display font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
          >
            Login karo
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4">
      <NavBar />

      <section className="mt-10">
        <h1 className="font-display text-2xl font-extrabold text-slate-900">
          Your history
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pichle saare scores, rewrites, aur downloads ek jagah.
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-slate-400">Load ho raha hai…</p>
        ) : scans.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="text-5xl">📄</div>
            <h2 className="mt-4 font-display text-xl font-extrabold text-slate-900">
              Abhi tak kuch nahi
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pehla resume score kar lelo!
            </p>
            <Link
              href="/scan"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-brand px-8 py-3 font-display font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
            >
              Score nikaal!
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {scans.map((scan) => {
              const pageInfo = pages.get(scan.id);
              return (
                <div
                  key={scan.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-display text-2xl font-extrabold ${scoreColor(scan.score)}`}
                        >
                          {scan.score}
                        </span>
                        <div className="h-8 w-px bg-slate-200" />
                        <p className="truncate text-sm font-medium text-slate-900">
                          {scan.jd.slice(0, 120)}
                          {scan.jd.length > 120 ? "…" : ""}
                        </p>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-400">
                        {new Date(scan.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {scan.portal}
                        {scan.rewritten_text ? " · Rewritten" : ""}
                      </p>
                    </div>
                    {pageInfo?.published && (
                      <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-semibold text-green-700">
                        Published
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/scan?id=${scan.id}`}
                      className="rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand/20"
                    >
                      Kholo / Edit karo
                    </Link>
                    {pageInfo?.published && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/r/${pageInfo.slug}`
                          );
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50"
                      >
                        Copy link
                      </button>
                    )}
                    {pageInfo && (
                      <button
                        onClick={() => handleTogglePublish(scan.id, pageInfo)}
                        disabled={toggling === scan.id}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-amber-200 hover:text-amber-600 disabled:opacity-50"
                      >
                        {toggling === scan.id
                          ? "…"
                          : pageInfo.published
                            ? "Unpublish"
                            : "Republish"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(scan.id)}
                      disabled={deleting === scan.id}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-red-200 hover:text-red-500 disabled:opacity-50"
                    >
                      {deleting === scan.id ? "…" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <p className="mt-6 rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">
            {error}
          </p>
        )}
      </section>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
      />
    </main>
  );
}
