"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseClient } from "@/lib/supabase-client";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Exchanging code for session…");

  useEffect(() => {
    if (!supabaseClient) {
      setStatus("Supabase not configured — redirecting…");
      setTimeout(() => router.replace("/scan"), 1500);
      return;
    }

    const code = searchParams.get("code");
    if (!code) {
      setStatus("No code found — redirecting…");
      setTimeout(() => router.replace("/scan"), 1500);
      return;
    }

    supabaseClient.auth
      .exchangeCodeForSession(code)
      .then(() => router.replace("/scan"))
      .catch(() => {
        setStatus("Something went wrong. Redirecting…");
        setTimeout(() => router.replace("/scan"), 2000);
      });
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-slate-500">{status}</p>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    }>
      <CallbackInner />
    </Suspense>
  );
}
