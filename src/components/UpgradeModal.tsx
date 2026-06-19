"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { openRazorpayCheckout } from "@/lib/razorpay";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

export function UpgradeModal({ open, onClose, reason }: UpgradeModalProps) {
  const { user, session } = useAuth();
  const [buying, setBuying] = useState(false);

  if (!open) return null;

  async function handleBuyOneshot() {
    setBuying(true);
    try {
      if (!user) return; // shouldn't happen — modal opens when user is signed in
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
    } catch {
      // Silently fail — user can retry
    } finally {
      setBuying(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-sm scale-100 rounded-2xl bg-white p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center text-4xl">😅</div>
        <h2 className="mt-3 text-center font-display text-xl font-extrabold text-slate-900">
          Free limit khatam, bhidu!
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          {reason || "Yeh feature Pro users ke liye hai. Unlimited AI tailoring, PDF/Word export, aur history."}
        </p>

        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">✨ <span>Unlimited AI resume tailoring</span></li>
          <li className="flex items-center gap-2">📄 <span>PDF + Word export with templates</span></li>
          <li className="flex items-center gap-2">📋 <span>Cover letter generator</span></li>
          <li className="flex items-center gap-2">📊 <span>Dashboard aur history</span></li>
        </ul>

        <div className="mt-4 text-center text-xs text-slate-400">
          ₹199/mo ya ₹999/yr
        </div>

        <Link
          href="/pricing"
          className="mt-4 flex w-full items-center justify-center rounded-xl bg-brand py-3 font-display font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
        >
          Pro le lo 🚀
        </Link>

        <div className="relative my-4 flex items-center gap-3">
          <div className="flex-1 border-t border-slate-200" />
          <span className="text-xs text-slate-400">ya</span>
          <div className="flex-1 border-t border-slate-200" />
        </div>

        <button
          onClick={handleBuyOneshot}
          disabled={buying}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 py-3 font-display font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
        >
          {buying ? "Processing…" : "Ek Baar le lo ⚡ — sirf ₹49"}
        </button>
        <p className="mt-1 text-center text-[10px] text-slate-400">
          1 AI tailor + 1 export — kabhi expire nahi hota
        </p>

        <button
          onClick={onClose}
          className="mt-3 w-full text-sm font-medium text-slate-400 transition hover:text-slate-600"
        >
          Thoda soch leta hu
        </button>
      </div>
    </div>
  );
}
