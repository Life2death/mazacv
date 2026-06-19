"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { useAuth } from "./AuthProvider";

interface NavBarProps {
  showLinks?: boolean;
}

export function NavBar({ showLinks = true }: NavBarProps) {
  const { user, loading, signOut } = useAuth();

  return (
    <nav className="flex items-center justify-between py-6">
      <Link href="/">
        <Logo size="sm" showTagline={false} />
      </Link>
      <div className="flex items-center gap-6 text-sm font-medium text-slate-600">
        {showLinks && (
          <>
            <Link href="/#how-it-works" className="hidden transition hover:text-brand sm:block">
              Kaise kaam karta hai
            </Link>
            <Link href="/pricing" className="hidden transition hover:text-brand sm:block">
              Pricing
            </Link>
          </>
        )}
        <Link
          href="/scan"
          className="hidden rounded-xl bg-brand px-5 py-2.5 font-display font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark sm:block"
        >
          Score nikaal — free!
        </Link>
        {loading ? null : user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:text-brand sm:block"
            >
              Dashboard
            </Link>
            <span className="hidden text-xs text-slate-400 sm:block">
              {user.email}
            </span>
            <button
              onClick={signOut}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-50"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
