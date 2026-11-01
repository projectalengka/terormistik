"use client";

import * as React from "react";

export function useAsync<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList = []
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
} {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);
  const loaderRef = React.useRef(loader);
  loaderRef.current = loader;

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loaderRef
      .current()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, reload, setData };
}

export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number
): ((...args: A) => void) & { flush: () => void; cancel: () => void } {
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = React.useRef(callback);
  latest.current = callback;

  const cancel = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const flush = React.useCallback(() => {
    cancel();
  }, [cancel]);

  const debounced = React.useCallback(
    (...args: A) => {
      cancel();
      timer.current = setTimeout(() => {
        latest.current(...args);
      }, delay);
    },
    [cancel, delay]
  );

  React.useEffect(() => cancel, [cancel]);

  return Object.assign(debounced, { flush, cancel });
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

export function useMounted(): boolean {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted;
}

export function useKeyboardShortcut(
  combo: { key: string; meta?: boolean; shift?: boolean },
  handler: (e: KeyboardEvent) => void
) {
  const ref = React.useRef(handler);
  ref.current = handler;
  React.useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      const metaOk = combo.meta ? e.metaKey || e.ctrlKey : !(e.metaKey || e.ctrlKey);
      const shiftOk = combo.shift ? e.shiftKey : !e.shiftKey;
      if (e.key.toLowerCase() === combo.key.toLowerCase() && metaOk && shiftOk) {
        ref.current(e);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [combo.key, combo.meta, combo.shift]);
}
