"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { useAuth } from "./AuthProvider";

interface NavBarProps {
  showLinks?: boolean;
}

export function NavBar({ showLinks = true }: NavBarProps) {
  const { user, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handle(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent && e.key === "Escape") { setMenuOpen(false); return; }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handle);
    return () => { document.removeEventListener("mousedown", handle); document.removeEventListener("keydown", handle); };
  }, [menuOpen]);

  const desktopLinks = user
    ? [
        { label: "Score", href: "/scan" },
        { label: "Tracker", href: "/tracker" },
        { label: "Jobs", href: "/settings" },
        { label: "Pricing", href: "/pricing" },
      ]
    : [
        { label: "How it works", href: "/#how-it-works" },
        { label: "Pricing", href: "/pricing" },
      ];

  return (
    <nav className="h-16 border-b border-slate-100 bg-white">
      <div className="mx-auto flex h-full max-w-6xl items-center px-4">
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Logo size="sm" showTagline={false} />
        </Link>

        {/* Desktop links — left-grouped */}
        {showLinks && (
          <div className="ml-8 hidden items-center gap-[26px] text-sm font-medium text-slate-600 sm:flex">
            {desktopLinks.map((l) => (
              <Link key={l.href} href={l.href} className="transition hover:text-brand">
                {l.label}
              </Link>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="ml-auto" />

        {/* Desktop right side */}
        <div className="hidden items-center gap-3 sm:flex">
          {showLinks && (
            <Link
              href="/scan"
              className="rounded-xl bg-brand px-5 py-2.5 font-display font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
            >
              Score nikaal{loading ? "" : user ? "" : " — free!"}
            </Link>
          )}

          {loading ? null : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Account menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-1"
              >
                <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                  {user.email?.[0]?.toUpperCase() ?? "?"}
                </div>
                <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-400">
                    {user.email}
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    History
                  </Link>
                  <Link
                    href="/linkedin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    LinkedIn
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    Job Settings
                  </Link>
                  <div className="border-t border-slate-100" />
                  <button
                    onClick={() => { signOut(); setMenuOpen(false); }}
                    className="flex w-full items-center px-4 py-2.5 text-sm text-red-500 transition hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="ml-auto flex items-center sm:hidden"
          aria-label="Menu"
        >
          <svg className="h-6 w-6 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white sm:hidden">
          <div className="space-y-1 px-4 py-3">
            {showLinks && desktopLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                {l.label}
              </Link>
            ))}
            {showLinks && (
              <Link
                href="/scan"
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl bg-brand px-3 py-2.5 text-center font-display font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
              >
                Score nikaal
              </Link>
            )}
            {loading ? null : user ? (
              <>
                <div className="border-t border-slate-100 pt-2">
                  <div className="px-3 pb-1 text-xs text-slate-400">{user.email}</div>
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">History</Link>
                  <Link href="/linkedin" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">LinkedIn</Link>
                  <Link href="/settings" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Job Settings</Link>
                  <button onClick={() => { signOut(); setMobileOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500 transition hover:bg-red-50">Logout</button>
                </div>
              </>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-600 transition hover:bg-slate-50">Login</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
