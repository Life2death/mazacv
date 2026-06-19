"use client";

import Link from "next/link";
import { NavBar } from "@/components/NavBar";

export default function LandingPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4">
      <NavBar />

      {/* Hero */}
      <section className="flex flex-col items-center pt-16 text-center sm:pt-24">
        <h1 className="font-display text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Resume ko banao{" "}
          <span className="text-brand">jhakaas</span>
          <br />
          naukri karo <span className="text-amber-brand">pakki</span>.
        </h1>
        <p className="mt-4 max-w-lg text-lg text-slate-500">
          Score your resume against any job description — free. Then let AI tailor it
          and download as PDF or Word.
        </p>

        <Link
          href="/scan"
          className="mt-8 rounded-xl bg-brand px-12 py-4 font-display text-lg font-semibold text-white shadow-xl shadow-brand/30 transition hover:bg-brand-dark"
        >
          Score nikaal — free!
        </Link>
      </section>

      {/* Trust strip */}
      <div className="mt-16 flex flex-wrap justify-center gap-x-8 gap-y-3 text-center text-sm font-medium text-slate-500">
        <span>10,000+ resumes scored</span>
        <span className="flex items-center gap-1">
          <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          Made in Mumbai ❤️
        </span>
        <span>Your data stays private 🔒</span>
      </div>

      {/* 3-step explainer */}
      <section id="how-it-works" className="mx-auto mt-24 max-w-4xl">
        <h2 className="font-display text-center text-2xl font-bold text-slate-900">
          Kaise kaam karta hai?
        </h2>
        <p className="mt-2 text-center text-slate-500">3 simple steps mein apna resume ready karo</p>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            {
              step: "1",
              emoji: "📄",
              title: "Upload karo",
              desc: "Apna resume daalo ya text paste karo. PDF, Word, ya plain text — sab chalega.",
            },
            {
              step: "2",
              emoji: "🎯",
              title: "Score dekho",
              desc: "JD paste karo aur dekho exactly kahan improve karna hai — free mein!",
            },
            {
              step: "3",
              emoji: "✨",
              title: "AI se fix karo",
              desc: "AI tailor karta hai resume ko job ke hisaab se. Phir PDF/Word mein download karo.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-2xl">
                {s.emoji}
              </div>
              <div className="mt-4 font-display text-lg font-bold text-slate-900">{s.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-24 border-t border-slate-200 py-8 text-center text-xs text-slate-400">
        <div className="flex items-center justify-center gap-1">
          Banaya Mumbai mein, ❤️ se.{" "}
          <a
            href="https://liftselo.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand hover:underline"
          >
            LiftLelo
          </a>{" "}
          family.
        </div>
        <p className="mt-1">Free unlimited scoring · AI tailoring &amp; export on Pro · mazacv.in</p>
      </footer>
    </main>
  );
}
