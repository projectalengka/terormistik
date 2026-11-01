import { NextResponse } from "next/server";
import { clientIp, jsonError, rateLimit, requireOwner } from "@/lib/server/guard";
import { geminiGenerate, uploadGeminiFile } from "@/lib/server/ai";
import { resolveKey } from "@/lib/server/secrets";
import { resolveModel } from "@/lib/server/registry";
import { parseStructured, VIDEO_PROMPT, VIDEO_SYSTEM } from "@/lib/server/prompts";
import { MAX_VIDEO_BYTES } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 300;

function isYouTube(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\//i.test(url);
}

export async function POST(req: Request) {
  const guard = await requireOwner();
  if (!guard.ok) return guard.response;

  const limit = rateLimit(`video:${clientIp(req)}`, 5, 60_000);
  if (!limit.ok) {
    return jsonError("Batas analisis video tercapai. Tunggu sebentar.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  const { key } = await resolveKey("gemini");
  if (!key) {
    return jsonError(
      "Gemini belum terhubung. Pemrosesan video memerlukan API key Gemini di AI Settings.",
      412,
      { needsConfiguration: true, provider: "gemini" }
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  let part: { file_data: { file_uri: string; mime_type?: string } };
  let sourceLabel = "video";
  let model = await resolveModel("gemini");

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return jsonError("Tidak ada berkas video.", 400);
      if (file.size === 0) return jsonError("Berkas video kosong.", 400);
      if (file.size > MAX_VIDEO_BYTES) {
        return jsonError(
          `Ukuran video melebihi ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB.`,
          413
        );
      }
      if (!file.type.startsWith("video/")) {
        return jsonError(`Format tidak didukung (${file.type || "tidak diketahui"}).`, 415);
      }
      if (form.get("model")) model = String(form.get("model"));

      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadGeminiFile(key, buffer, file.type, file.name);
      part = { file_data: { file_uri: uploaded.uri, mime_type: file.type } };
      sourceLabel = file.name;
    } else {
      const body = (await req.json().catch(() => null)) as { url?: string; model?: string } | null;
      const url = body?.url?.trim();
      if (!url) return jsonError("Masukkan URL video publik.", 400);
      if (!/^https?:\/\//i.test(url)) return jsonError("URL harus dimulai dengan http:// atau https://.", 400);
      if (body?.model) model = body.model;

      if (isYouTube(url)) {
        part = { file_data: { file_uri: url } };
        sourceLabel = url;
      } else {
        const res = await fetch(url, {
          redirect: "follow",
          signal: AbortSignal.timeout(120_000),
          headers: { "User-Agent": "TEROR-MISTIK/1.0 (+personal archive)" },
        }).catch(() => null);

        if (!res || !res.ok) {
          return jsonError(
            `URL video tidak dapat diakses${res ? ` (HTTP ${res.status})` : ""}. Pastikan tautan publik dan masih aktif.`,
            422
          );
        }

        const declaredLength = Number(res.headers.get("content-length") ?? "0");
        if (declaredLength > MAX_VIDEO_BYTES) {
          return jsonError(
            `Video melebihi ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB.`,
            413
          );
        }

        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.byteLength > MAX_VIDEO_BYTES) {
          return jsonError(
            `Video melebihi ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB.`,
            413
          );
        }

        const mime =
          res.headers.get("content-type")?.split(";")[0]?.trim() ||
          (url.endsWith(".mp4") ? "video/mp4" : "video/mp4");

        if (!mime.startsWith("video/") && !mime.startsWith("application/octet-stream")) {
          return jsonError(
            `Tautan tidak mengarah ke berkas video (content-type: ${mime}). Gunakan tautan langsung ke berkas video.`,
            415
          );
        }

        const uploaded = await uploadGeminiFile(
          key,
          buffer,
          mime.startsWith("video/") ? mime : "video/mp4",
          url.split("/").pop()?.slice(0, 80) || "video"
        );
        part = {
          file_data: {
            file_uri: uploaded.uri,
            mime_type: mime.startsWith("video/") ? mime : "video/mp4",
          },
        };
        sourceLabel = url;
      }
    }

    const output = await geminiGenerate({
      key,
      model,
      system: VIDEO_SYSTEM,
      parts: [part, { text: VIDEO_PROMPT }],
      temperature: 0.7,
      maxTokens: 4096,
    });

    const structured = parseStructured(output);

    return NextResponse.json({
      output,
      summary: structured.summary,
      keyPoints: structured.keyPoints,
      provider: "gemini",
      model,
      source: sourceLabel,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analisis video gagal.";
    return jsonError(message, 502);
  }
}
