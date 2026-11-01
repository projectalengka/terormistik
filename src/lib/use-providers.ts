"use client";

import * as React from "react";
import type { ProviderStatus } from "./types";

export interface ProviderState {
  providers: ProviderStatus[];
  primary: string;
  fallback: string | null;
  writable: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

let cache: {
  providers: ProviderStatus[];
  primary: string;
  fallback: string | null;
  writable: boolean;
} | null = null;

export function useProviders(): ProviderState {
  const [state, setState] = React.useState(() => ({
    providers: cache?.providers ?? [],
    primary: cache?.primary ?? "openrouter",
    fallback: cache?.fallback ?? null,
    writable: cache?.writable ?? true,
    loading: !cache,
    error: null as string | null,
  }));

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/providers", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat status provider.");
      cache = {
        providers: json.providers as ProviderStatus[],
        primary: json.primary as string,
        fallback: (json.fallback as string | null) ?? null,
        writable: Boolean(json.writable),
      };
      setState({ ...cache, loading: false, error: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Gagal memuat status provider.",
      }));
    }
  }, []);

  React.useEffect(() => {
    if (!cache) void load();
  }, [load]);

  return { ...state, refresh: load };
}

export async function saveProviderKey(
  provider: string,
  apiKey: string
): Promise<{ ok: boolean; message: string; models?: string[] }> {
  const res = await fetch("/api/providers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, apiKey }),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false, message: json.error ?? "Gagal menyimpan kunci." };
  cache = null;
  const test = json.test as { ok: boolean; message: string; models?: string[] } | null;
  return {
    ok: test?.ok ?? true,
    message: test?.message ?? "Kunci tersimpan.",
    models: test?.models,
  };
}

export async function removeProviderKey(provider: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`/api/providers?provider=${encodeURIComponent(provider)}`, {
    method: "DELETE",
  });
  const json = await res.json();
  cache = null;
  if (!res.ok) return { ok: false, message: json.error ?? "Gagal menghapus kunci." };
  return { ok: true, message: "Kunci dihapus." };
}

export function invalidateProviderCache() {
  cache = null;
}
