"use client";

export interface AiPrefs {
  provider: "openrouter" | "gemini";
  model: string;
  fallback: "gemini" | "openrouter" | "none";
}

const KEY = "tm.ai.prefs";

const DEFAULT_PREFS: AiPrefs = {
  provider: "openrouter",
  model: "",
  fallback: "gemini",
};

export function readAiPrefs(): AiPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<AiPrefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writeAiPrefs(prefs: AiPrefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}
