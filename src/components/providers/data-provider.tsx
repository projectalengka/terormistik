"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import type { DataMode, Profile } from "@/lib/types";
import type { Repository } from "@/lib/data/repository";
import { LocalRepository } from "@/lib/data/local";
import { SupabaseRepository } from "@/lib/data/supabase";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface DataContextValue {
  mode: DataMode;
  repo: Repository;
  profile: Profile | null;
  email: string | null;
  ready: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const DataContext = React.createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const configured = isSupabaseConfigured();
  const mode: DataMode = configured ? "supabase" : "local";

  const [repo, setRepo] = React.useState<Repository | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [email, setEmail] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!configured) {
        const local = new LocalRepository();
        const p = await local.getProfile();
        if (cancelled) return;
        setRepo(local);
        setProfile(p);
        setReady(true);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();

        if (!data.session?.user) {
          const next = pathname && pathname !== "/login" ? `?next=${encodeURIComponent(pathname)}` : "";
          router.replace(`/login${next}`);
          return;
        }

        const instance = new SupabaseRepository(data.session.user.id);
        const p = await instance.getProfile().catch(() => null);
        if (cancelled) return;
        setRepo(instance);
        setProfile(p);
        setEmail(data.session.user.email ?? null);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Gagal menyiapkan sesi.");
        setReady(true);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  React.useEffect(() => {
    if (!configured) return;
    const supabase = getSupabaseBrowserClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [configured, router]);

  const refreshProfile = React.useCallback(async () => {
    if (!repo) return;
    try {
      const p = await repo.getProfile();
      setProfile(p);
    } catch {
      /* non-fatal */
    }
  }, [repo]);

  const signOut = React.useCallback(async () => {
    if (!configured) {
      router.push("/dashboard");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }, [configured, router]);

  const value = React.useMemo<DataContextValue | null>(() => {
    if (!repo) return null;
    return { mode, repo, profile, email, ready, error, refreshProfile, signOut };
  }, [repo, mode, profile, email, ready, error, refreshProfile, signOut]);

  if (!value) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border border-line border-t-accent" />
          <p className="text-[11px] uppercase tracking-[0.28em] text-faint">Menyiapkan arsip</p>
        </div>
      </div>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = React.useContext(DataContext);
  if (!ctx) throw new Error("useData harus dipakai di dalam DataProvider.");
  return ctx;
}

export function useRepo(): Repository {
  return useData().repo;
}
