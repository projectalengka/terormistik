import "server-only";

import type { ProviderId } from "./secrets";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GROQ_BASE = "https://api.groq.com/openai/v1";

export class ProviderError extends Error {
  status: number;
  provider: string;
  constructor(message: string, provider: string, status = 502) {
    super(message);
    this.provider = provider;
    this.status = status;
  }
}

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text);
    return (
      json?.error?.message ??
      json?.error?.status ??
      json?.message ??
      text.slice(0, 300) ??
      `HTTP ${res.status}`
    );
  } catch {
    return text.slice(0, 300) || `HTTP ${res.status}`;
  }
}

/* ————————————————— OpenRouter ————————————————— */

export async function openRouterComplete(opts: {
  key: string;
  model: string;
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
}): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      "X-Title": "TEROR MISTIK",
    },
    body: JSON.stringify({
      model: opts.model,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    const detail = await readError(res);
    throw new ProviderError(
      res.status === 401
        ? "Kunci OpenRouter ditolak. Periksa kembali API key Anda."
        : res.status === 402
          ? "Kredit OpenRouter tidak mencukupi untuk permintaan ini."
          : res.status === 429
            ? "Batas permintaan OpenRouter tercapai. Coba lagi beberapa saat."
            : `OpenRouter gagal: ${detail}`,
      "openrouter",
      res.status
    );
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };

  if (json.error?.message) throw new ProviderError(json.error.message, "openrouter");
  const content = json.choices?.[0]?.message?.content;
  if (!content || !content.trim()) {
    throw new ProviderError("OpenRouter mengembalikan respons kosong.", "openrouter");
  }
  return content.trim();
}

/* ————————————————— Gemini ————————————————— */

type GeminiPart =
  | { text: string }
  | { file_data: { file_uri: string; mime_type?: string } };

export async function geminiGenerate(opts: {
  key: string;
  model: string;
  system?: string;
  parts: GeminiPart[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const url = `${GEMINI_BASE}/models/${encodeURIComponent(opts.model)}:generateContent?key=${encodeURIComponent(opts.key)}`;

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: opts.parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.8,
      maxOutputTokens: opts.maxTokens ?? 4096,
    },
  };
  if (opts.system) {
    body.systemInstruction = { parts: [{ text: opts.system }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300_000),
  });

  if (!res.ok) {
    const detail = await readError(res);
    throw new ProviderError(
      res.status === 400 && /API key not valid/i.test(detail)
        ? "Kunci Gemini tidak valid."
        : res.status === 429
          ? "Kuota Gemini tercapai. Coba lagi nanti."
          : `Gemini gagal: ${detail}`,
      "gemini",
      res.status
    );
  }

  const json = (await res.json()) as {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      finishReason?: string;
    }[];
    promptFeedback?: { blockReason?: string };
  };

  if (json.promptFeedback?.blockReason) {
    throw new ProviderError(
      `Permintaan diblokir oleh filter Gemini (${json.promptFeedback.blockReason}).`,
      "gemini",
      422
    );
  }

  const text = json.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) throw new ProviderError("Gemini mengembalikan respons kosong.", "gemini");
  return text;
}

/* ————————————————— Unified completion ————————————————— */

export interface CompletionRequest {
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
}

export async function completeWith(
  provider: ProviderId,
  key: string,
  model: string,
  req: CompletionRequest
): Promise<string> {
  if (provider === "openrouter") {
    return openRouterComplete({ key, model, ...req });
  }
  if (provider === "gemini") {
    return geminiGenerate({
      key,
      model,
      system: req.system,
      parts: [{ text: req.user }],
      temperature: req.temperature,
      maxTokens: req.maxTokens,
    });
  }
  throw new ProviderError(
    "Provider ini tidak mendukung penyelesaian teks.",
    provider,
    400
  );
}

/* ————————————————— Groq Whisper ————————————————— */

export async function groqTranscribe(opts: {
  key: string;
  file: File;
  model: string;
  language?: string;
  prompt?: string;
}): Promise<{ text: string; duration?: number; language?: string }> {
  const form = new FormData();
  form.append("file", opts.file, opts.file.name || "audio.mp3");
  form.append("model", opts.model);
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");
  if (opts.language && opts.language !== "auto") form.append("language", opts.language);
  if (opts.prompt) form.append("prompt", opts.prompt);

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.key}` },
    body: form,
    signal: AbortSignal.timeout(300_000),
  });

  if (!res.ok) {
    const detail = await readError(res);
    throw new ProviderError(
      res.status === 401
        ? "Kunci Groq ditolak."
        : res.status === 413
          ? "Ukuran berkas melebihi batas Groq (25 MB)."
          : `Groq gagal: ${detail}`,
      "groq",
      res.status
    );
  }

  const json = (await res.json()) as { text?: string; duration?: number; language?: string };
  if (!json.text) throw new ProviderError("Transkripsi kosong.", "groq");
  return { text: json.text.trim(), duration: json.duration, language: json.language };
}

/* ————————————————— Gemini File API ————————————————— */

export async function uploadGeminiFile(
  key: string,
  buffer: Buffer,
  mimeType: string,
  displayName: string
): Promise<{ uri: string; name: string }> {
  const startRes = await fetch(`${GEMINI_BASE.replace("/v1beta", "")}/upload/v1beta/files?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(buffer.byteLength),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: displayName } }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!startRes.ok) {
    throw new ProviderError(`Gagal memulai unggahan ke Gemini: ${await readError(startRes)}`, "gemini");
  }

  const uploadUrl = startRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new ProviderError("Gemini tidak mengembalikan URL unggahan.", "gemini");

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(buffer.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: new Uint8Array(buffer),
    signal: AbortSignal.timeout(300_000),
  });

  if (!uploadRes.ok) {
    throw new ProviderError(`Unggahan berkas ke Gemini gagal: ${await readError(uploadRes)}`, "gemini");
  }

  const json = (await uploadRes.json()) as { file?: { uri?: string; name?: string; state?: string } };
  const uri = json.file?.uri;
  const name = json.file?.name;
  if (!uri || !name) throw new ProviderError("Berkas tidak diterima Gemini.", "gemini");

  // Poll until the file is ACTIVE
  for (let attempt = 0; attempt < 30; attempt++) {
    const statusRes = await fetch(`${GEMINI_BASE}/${name}?key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(30_000),
    });
    if (statusRes.ok) {
      const status = (await statusRes.json()) as { state?: string };
      if (status.state === "ACTIVE") return { uri, name };
      if (status.state === "FAILED") {
        throw new ProviderError("Gemini gagal memproses berkas video.", "gemini");
      }
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  throw new ProviderError("Waktu tunggu pemrosesan berkas Gemini habis.", "gemini", 504);
}

/* ————————————————— Provider tests ————————————————— */

export async function testProviderConnection(
  provider: ProviderId,
  key: string
): Promise<{ ok: boolean; message: string; models?: string[] }> {
  try {
    if (provider === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/key", {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) return { ok: false, message: `Ditolak OpenRouter (HTTP ${res.status}).` };
      const json = (await res.json()) as { data?: { label?: string; limit?: number | null } };
      return {
        ok: true,
        message: `Terhubung${json.data?.label ? ` sebagai ${json.data.label}` : ""}.`,
      };
    }

    if (provider === "gemini") {
      const res = await fetch(`${GEMINI_BASE}/models?key=${encodeURIComponent(key)}`, {
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) return { ok: false, message: `Ditolak Gemini (HTTP ${res.status}).` };
      const json = (await res.json()) as { models?: { name: string }[] };
      const models = (json.models ?? [])
        .map((m) => m.name.replace("models/", ""))
        .filter((m) => m.startsWith("gemini"))
        .slice(0, 24);
      return { ok: true, message: `Terhubung. ${models.length} model tersedia.`, models };
    }

    if (provider === "groq") {
      const res = await fetch(`${GROQ_BASE}/models`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) return { ok: false, message: `Ditolak Groq (HTTP ${res.status}).` };
      const json = (await res.json()) as { data?: { id: string }[] };
      const models = (json.data ?? []).map((m) => m.id).filter((id) => id.includes("whisper"));
      return { ok: true, message: `Terhubung. ${models.length} model Whisper tersedia.`, models };
    }

    return { ok: false, message: "Provider tidak dikenal." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Koneksi gagal.",
    };
  }
}
