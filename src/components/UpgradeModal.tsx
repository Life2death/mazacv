"use client";

import Link from "next/link";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

export function UpgradeModal({ open, onClose, reason }: UpgradeModalProps) {
  if (!open) return null;

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
