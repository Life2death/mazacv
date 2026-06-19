"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Session, User, AuthError } from "@supabase/supabase-js";
import { supabaseClient } from "@/lib/supabase-client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const emptyCtx: AuthContextValue = {
  user: null, session: null, loading: false,
  signInWithMagicLink: async () => ({ error: null }),
  signInWithGoogle: async () => {},
  signOut: async () => {},
};

const AuthContext = createContext<AuthContextValue>(emptyCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseClient) {
      setLoading(false);
      return;
    }

    supabaseClient.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const signInWithMagicLink = useCallback(async (email: string) => {
    if (!supabaseClient) return { error: null };
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/scan`,
      },
    });
    return { error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithMagicLink, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
