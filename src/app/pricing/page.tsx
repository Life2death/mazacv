"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/components/AuthProvider";
import { openRazorpayCheckout } from "@/lib/razorpay";
import type { Credits } from "@/lib/types";

function PricingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, session } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState("");

  const upgraded = searchParams.get("upgraded") === "1";

  function PaymentLogos({ className = "" }: { className?: string }) {
    return (
      <div className={`mt-4 flex flex-wrap items-center justify-center gap-2 ${className}`}>
        <span className="rounded-md bg-[#0973D6]/10 px-2 py-0.5 text-[10px] font-bold text-[#0973D6]">UPI</span>
        <span className="rounded-md bg-[#3399FF]/10 px-2 py-0.5 text-[10px] font-bold text-[#3399FF]">Razorpay</span>
        <span className="rounded-md bg-[#6C3FB8]/10 px-2 py-0.5 text-[10px] font-bold text-[#6C3FB8]">RuPay</span>
        <span className="rounded-md bg-[#1A1F71]/10 px-2 py-0.5 text-[10px] font-bold text-[#1A1F71]">Visa</span>
        <span className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold text-[#EB001B]">
          <span className="relative">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#EB001B] opacity-60" />
            <span className="absolute -left-1 top-0 inline-block h-2.5 w-2.5 rounded-full bg-[#F79E1B] opacity-60" />
          </span>
          Mastercard
        </span>
        <span className="text-[10px] text-slate-300">+</span>
        <span className="text-[10px] text-slate-400">Net Banking</span>
      </div>
    );
  }

  useEffect(() => {
    if (upgraded) {
      const timer = setTimeout(() => router.replace("/scan"), 3000);
      return () => clearTimeout(timer);
    }
  }, [upgraded, router]);

  async function handleSubscribe() {
    setError("");
    setSubscribing(true);

    try {
      // If not logged in, redirect to login
      if (!user) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/razorpay/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ plan: billing }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start subscription.");

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? data.key_id;
      await openRazorpayCheckout({
        key_id: keyId,
        subscription_id: data.subscription_id,
        name: "MazaCV",
        description: `Pro ${billing === "monthly" ? "Monthly" : "Yearly"} Subscription`,
        prefill: { email: user.email ?? "" },
        callback_url: `${window.location.origin}/api/razorpay/verify`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Arre, kuch locha ho gaya. Phirse try kar.");
    } finally {
      setSubscribing(false);
    }
  }

  async function handleBuyOneshot() {
    setError("");
    setSubscribing(true);

    try {
      if (!user) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order.");

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? data.key_id;
      await openRazorpayCheckout({
        key_id: keyId,
        order_id: data.order_id,
        name: "MazaCV",
        description: "Ek Baar — 1 AI Tailor + 1 Export",
        prefill: { email: user.email ?? "" },
        callback_url: `${window.location.origin}/api/razorpay/verify-order`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Arre, kuch locha ho gaya. Phirse try kar.");
    } finally {
      setSubscribing(false);
    }
  }

  if (upgraded) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-4">
        <NavBar />
        <section className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="text-5xl">🎉</div>
          <h1 className="mt-4 font-display text-3xl font-extrabold text-green-600">
            Ho gaya, boss!
          </h1>
          <p className="mt-2 max-w-md text-slate-500">
            {upgraded ? "Ab unlimited AI tailoring, export, cover letter, aur history — sab mil raha hai." : "1 AI tailor aur 1 export — ab use karo!"}
          </p>
          <p className="mt-1 text-xs text-slate-400">Redirecting to scanner…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4">
      <NavBar />

      <section className="mx-auto mt-12 max-w-4xl">
        <h1 className="text-center font-display text-3xl font-extrabold text-slate-900">
          Choose your plan
        </h1>
        <p className="mt-2 text-center text-slate-500">
          Koi tension nahi — kabhi bhi cancel kar sakte ho!
        </p>

        {/* Trust strip */}
        <div className="mx-auto mt-8 mb-2 flex max-w-xl items-center justify-center gap-6 text-xs text-slate-400">
          <span>📊 10,000+ resumes scored</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">🔒 Your data stays private</span>
          <span className="hidden sm:inline">•</span>
          <span>🇮🇳 Made in Mumbai</span>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {/* Free plan */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-display text-xl font-bold text-slate-900">Bindaas</h2>
            <p className="mt-1 text-xs text-slate-400">Free — hamesha</p>
            <p className="mt-6 font-display text-4xl font-extrabold text-slate-900">
              ₹0
            </p>
            <p className="mt-1 text-sm text-slate-500">lifetime free</p>

            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2">✅ <span>Unlimited ATS scoring</span></li>
              <li className="flex items-center gap-2">✅ <span>Format tips aur warnings</span></li>
              <li className="flex items-center gap-2">— <span className="text-slate-300">AI resume tailoring</span></li>
              <li className="flex items-center gap-2">— <span className="text-slate-300">PDF / Word export</span></li>
              <li className="flex items-center gap-2">— <span className="text-slate-300">Cover letter generator</span></li>
              <li className="flex items-center gap-2">— <span className="text-slate-300">Dashboard aur history</span></li>
            </ul>

            <Link
              href="/scan"
              className="mt-6 flex w-full items-center justify-center rounded-xl border border-brand py-3 font-display font-semibold text-brand transition hover:bg-brand/5"
            >
              Score nikaal — free!
            </Link>
          </div>

          {/* Ek Baar (one-shot) */}
          <div className="relative rounded-2xl border-2 border-amber-300 bg-white p-6 shadow-lg shadow-amber-200/40">
            <span className="absolute -top-3 right-6 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              One-shot
            </span>
            <h2 className="font-display text-xl font-bold text-slate-900">Ek Baar</h2>
            <p className="mt-1 text-xs text-slate-400">Sirf ek baar — lifetime validity</p>

            <div className="mt-6 font-display text-4xl font-extrabold text-amber-600">
              ₹49
              <span className="text-base font-normal text-slate-400"> one-time</span>
            </div>
            <p className="mt-1 text-xs text-amber-700">1 AI tailor + 1 export</p>

            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2">✅ <span>Unlimited ATS scoring</span></li>
              <li className="flex items-center gap-2">✅ <span>1 AI resume tailoring</span></li>
              <li className="flex items-center gap-2">✅ <span>1 PDF + Word export (6 templates)</span></li>
              <li className="flex items-center gap-2">— <span className="text-slate-300">Cover letter generator</span></li>
              <li className="flex items-center gap-2">— <span className="text-slate-300">Dashboard aur history</span></li>
              <li className="flex items-center gap-2">✅ <span>Kabhi expire nahi hota</span></li>
            </ul>

            <button
              onClick={handleBuyOneshot}
              disabled={subscribing}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-amber-500 py-3 font-display font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-600 disabled:opacity-50"
            >
              {subscribing
                ? "Processing…"
                : user
                  ? "Ek Baar le lo ⚡ — ₹49"
                  : "Login karke lo →"}
            </button>

            <PaymentLogos />
          </div>

          {/* Pro plan */}
          <div className="relative rounded-2xl border-2 border-brand bg-white p-6 shadow-lg shadow-brand/10">
            <span className="absolute -top-3 right-6 rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              Popular
            </span>
            <h2 className="font-display text-xl font-bold text-slate-900">Jhakaas</h2>
            <p className="mt-1 text-xs text-slate-400">Pro — sab kuch khula</p>

            <div className="mt-6">
              <div className="flex items-center gap-3">
                <span className={`cursor-pointer text-sm font-medium ${billing === "monthly" ? "text-brand" : "text-slate-400"}`}
                      onClick={() => setBilling("monthly")}>Monthly</span>
                <button
                  onClick={() => setBilling(billing === "monthly" ? "yearly" : "monthly")}
                  className={`relative h-6 w-11 rounded-full transition ${
                    billing === "yearly" ? "bg-brand" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                      billing === "yearly" ? "translate-x-5" : ""
                    }`}
                  />
                </button>
                <span className={`cursor-pointer text-sm font-medium ${billing === "yearly" ? "text-brand" : "text-slate-400"}`}
                      onClick={() => setBilling("yearly")}>Yearly</span>
              </div>
              <div className="mt-3 font-display text-4xl font-extrabold text-slate-900">
                ₹{billing === "monthly" ? "199" : "999"}
                <span className="text-base font-normal text-slate-400">
                  /{billing === "monthly" ? "mo" : "yr"}
                </span>
              </div>
              {billing === "yearly" && (
                <p className="mt-1 text-xs font-semibold text-green-600">Save ₹1,389/year!</p>
              )}
            </div>

            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-2">✅ <span>Unlimited ATS scoring</span></li>
              <li className="flex items-center gap-2">✅ <span>Unlimited AI resume tailoring</span></li>
              <li className="flex items-center gap-2">✅ <span>PDF + Word export with 6 templates</span></li>
              <li className="flex items-center gap-2">✅ <span>Unlimited cover letter generator</span></li>
              <li className="flex items-center gap-2">✅ <span>Dashboard aur history</span></li>
              <li className="flex items-center gap-2">✅ <span>Cancel kabhi bhi. No tension.</span></li>
            </ul>

            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-brand py-3 font-display font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark disabled:opacity-50"
            >
              {subscribing
                ? "Processing…"
                : user
                  ? `Pro le lo 🚀 — ₹${billing === "monthly" ? "199/mo" : "999/yr"}`
                  : "Login karke Pro lo →"}
            </button>

            <PaymentLogos />
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          <p className="flex items-center justify-center gap-2">
            <span>🔒 Secure payment — powered by Razorpay</span>
          </p>
          <p className="mt-1">Your data stays private. Kabhi bhi cancel kar sakte ho.</p>
        </div>

        {error && (
          <p className="mx-auto mt-6 max-w-md rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">
            {error}
          </p>
        )}
      </section>

      <footer className="mt-20 border-t border-slate-200 py-8 text-center text-xs text-slate-400">
        Banaya Mumbai mein, ❤️ se. LiftLelo family.
      </footer>
    </main>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    }>
      <PricingInner />
    </Suspense>
  );
}
