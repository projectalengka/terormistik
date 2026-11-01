import { NextResponse } from "next/server";
import { clientIp, jsonError, rateLimit, requireOwner } from "@/lib/server/guard";
import { geminiGenerate, groqTranscribe, uploadGeminiFile } from "@/lib/server/ai";
import { resolveKey, type ProviderId } from "@/lib/server/secrets";
import { resolveModel } from "@/lib/server/registry";
import { MAX_AUDIO_BYTES } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 300;

const AUDIO_MIME = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/opus",
  "video/webm",
  "video/mp4",
];

export async function POST(req: Request) {
  const guard = await requireOwner();
  if (!guard.ok) return guard.response;

  const limit = rateLimit(`transcribe:${clientIp(req)}`, 10, 60_000);
  if (!limit.ok) {
    return jsonError("Batas transkripsi tercapai. Tunggu sebentar.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Berkas tidak terbaca. Unggah ulang berkas audio Anda.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Tidak ada berkas audio yang dikirim.", 400);

  if (file.size === 0) return jsonError("Berkas kosong.", 400);
  if (file.size > MAX_AUDIO_BYTES) {
    return jsonError(
      `Ukuran berkas melebihi ${Math.round(MAX_AUDIO_BYTES / 1024 / 1024)} MB. Potong audio atau gunakan berkas lain.`,
      413
    );
  }

  const mime = file.type || "application/octet-stream";
  const looksAudio = AUDIO_MIME.includes(mime) || mime.startsWith("audio/") || mime.startsWith("video/");
  if (!looksAudio) {
    return jsonError(`Format berkas tidak didukung (${mime}). Gunakan MP3, WAV, M4A, atau WebM.`, 415);
  }

  const language = String(form.get("language") ?? "id");
  const providerHint = String(form.get("provider") ?? "groq") as ProviderId;
  const modelHint = form.get("model") ? String(form.get("model")) : undefined;
  const promptHint = form.get("prompt") ? String(form.get("prompt")) : undefined;

  const provider: ProviderId = providerHint === "gemini" ? "gemini" : "groq";
  const { key, source } = await resolveKey(provider);

  if (!key) {
    return jsonError(
      `Provider ${provider} belum terhubung. Buka AI Settings untuk menambahkan API key.`,
      412,
      { needsConfiguration: true, provider }
    );
  }

  const model = await resolveModel(provider, modelHint);

  try {
    if (provider === "groq") {
      const result = await groqTranscribe({
        key,
        file,
        model,
        language,
        prompt: promptHint,
      });
      return NextResponse.json({
        text: result.text,
        duration: result.duration ?? null,
        language: result.language ?? language,
        provider,
        model,
        keySource: source,
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadGeminiFile(key, buffer, mime, file.name);
    const text = await geminiGenerate({
      key,
      model,
      system:
        "Anda adalah mesin transkripsi. Tuliskan seluruh ucapan dalam rekaman apa adanya, tanpa ringkasan, tanpa komentar, tanpa penambahan. Jika ada bagian tidak jelas, tandai dengan [tidak jelas]. Gunakan bahasa yang sama dengan rekaman.",
      parts: [
        { file_data: { file_uri: uploaded.uri, mime_type: mime } },
        { text: "Transkripsikan seluruh audio ini." },
      ],
      temperature: 0.1,
      maxTokens: 8192,
    });

    return NextResponse.json({
      text,
      duration: null,
      language,
      provider,
      model,
      keySource: source,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transkripsi gagal.";
    return jsonError(message, 502);
  }
}
