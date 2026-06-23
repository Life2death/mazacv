"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/components/AuthProvider";
import { PMSettingsForm } from "@/components/PMSettingsForm";

export default function SettingsPage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [session, loading, router]);

  if (loading) return null;
  if (!session) return null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <NavBar />

      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-slate-900">Job Search Settings ⚙️</h1>
        <p className="mt-1 text-sm text-slate-500">Ek baar set kar — baar baar kaam aayega</p>
      </div>

      <PMSettingsForm accessToken={session?.access_token} />

      <footer className="mt-12 text-center text-xs text-slate-400">
        Free unlimited scoring · AI tailoring &amp; export on Pro · Banaya Mumbai mein ❤️ ·
        mazacv.in
      </footer>
    </main>
  );
}
