"use client";

import Link from "next/link";
import { NavBar } from "@/components/NavBar";

export default function PricingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-4">
      <NavBar />

      <section className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="text-5xl">👷</div>
        <h1 className="mt-4 font-display text-3xl font-extrabold text-slate-900">
          Pricing — a raha hai!
        </h1>
        <p className="mt-2 max-w-md text-slate-500">
          Abhi free mein score karo — jab pricing ready hogi, sabse pehle tumhe pata chalega.
        </p>
        <Link
          href="/scan"
          className="mt-6 rounded-xl bg-brand px-8 py-3 font-display font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
        >
          Score nikaal — free!
        </Link>
      </section>

      <footer className="py-8 text-center text-xs text-slate-400">
        Banaya Mumbai mein, ❤️ se. LiftLelo family.
      </footer>
    </main>
  );
}
