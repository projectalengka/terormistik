import "server-only";

import type { ProviderStatus } from "../types";
import { AI_MODELS } from "../constants";
import { resolveKey, type ProviderId } from "./secrets";

export const PROVIDER_META: Record<
  ProviderId,
  { label: string; purpose: string; docsUrl: string; envName: string; defaultModel: string }
> = {
  openrouter: {
    label: "OpenRouter",
    purpose: "Model bahasa untuk AI Writing Studio",
    docsUrl: "https://openrouter.ai/keys",
    envName: "OPENROUTER_API_KEY",
    defaultModel: process.env.OPENROUTER_MODEL ?? "openrouter/auto",
  },
  gemini: {
    label: "Google Gemini",
    purpose: "Pemrosesan video, audio alternatif, dan fallback teks",
    docsUrl: "https://aistudio.google.com/apikey",
    envName: "GEMINI_API_KEY",
    defaultModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  },
  groq: {
    label: "Groq Whisper",
    purpose: "Transkripsi audio ke teks",
    docsUrl: "https://console.groq.com/keys",
    envName: "GROQ_API_KEY",
    defaultModel: process.env.GROQ_WHISPER_MODEL ?? "whisper-large-v3",
  },
};

export function primaryProvider(): ProviderId {
  const value = (process.env.AI_PRIMARY_PROVIDER ?? "openrouter").toLowerCase();
  return value === "gemini" || value === "groq" ? (value as ProviderId) : "openrouter";
}

export function fallbackProvider(): ProviderId | null {
  const value = (process.env.AI_FALLBACK_PROVIDER ?? "gemini").toLowerCase();
  if (value === "none") return null;
  if (value === "openrouter" || value === "gemini" || value === "groq") return value as ProviderId;
  return null;
}

export async function providerStatuses(): Promise<ProviderStatus[]> {
  const ids: ProviderId[] = ["openrouter", "gemini", "groq"];
  const results: ProviderStatus[] = [];

  for (const id of ids) {
    const { key, source } = await resolveKey(id);
    results.push({
      id,
      label: PROVIDER_META[id].label,
      configured: Boolean(key),
      source,
      defaultModel: PROVIDER_META[id].defaultModel,
      models: AI_MODELS[id] ?? [],
      purpose: PROVIDER_META[id].purpose,
      docsUrl: PROVIDER_META[id].docsUrl,
    });
  }

  return results;
}

export async function resolveModel(provider: ProviderId, requested?: string): Promise<string> {
  if (requested && requested.trim()) return requested.trim();
  return PROVIDER_META[provider].defaultModel;
}
