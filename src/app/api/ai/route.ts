import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, jsonError, rateLimit, requireOwner } from "@/lib/server/guard";
import { completeWith, ProviderError } from "@/lib/server/ai";
import { buildPrompt } from "@/lib/server/prompts";
import { fallbackProvider, primaryProvider, resolveModel } from "@/lib/server/registry";
import { resolveKey, type ProviderId } from "@/lib/server/secrets";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_INPUT_CHARS = 30_000;

const schema = z.object({
  action: z.enum([
    "clean",
    "narrate",
    "dramatize",
    "develop",
    "chapters",
    "synopsis",
    "title",
    "consistency",
  ]),
  mode: z.enum(["natural", "professional"]),
  text: z.string().min(1, "Naskah kosong.").max(80_000),
  title: z.string().max(200).optional(),
  extra: z.string().max(2000).optional(),
  provider: z.enum(["openrouter", "gemini", "groq"]).optional(),
  model: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  const guard = await requireOwner();
  if (!guard.ok) return guard.response;

  const limit = rateLimit(`ai:${clientIp(req)}`, 20, 60_000);
  if (!limit.ok) {
    return jsonError("Batas permintaan AI tercapai. Tunggu sebentar sebelum mencoba lagi.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Permintaan tidak valid.",
      400
    );
  }

  const data = parsed.data;
  const truncated = data.text.length > MAX_INPUT_CHARS;
  const sourceText = truncated ? data.text.slice(0, MAX_INPUT_CHARS) : data.text;

  const prompt = buildPrompt({
    action: data.action,
    mode: data.mode,
    text: sourceText,
    title: data.title,
    extra: data.extra,
  });

  const requested = (data.provider ?? primaryProvider()) as ProviderId;
  const order: ProviderId[] = [requested];
  const fb = fallbackProvider();
  if (fb && fb !== requested && fb !== "groq") order.push(fb);

  const errors: string[] = [];

  for (const provider of order) {
    const { key } = await resolveKey(provider);
    if (!key) {
      errors.push(`${provider}: belum dikonfigurasi`);
      continue;
    }

    const model = await resolveModel(provider, data.model);

    try {
      const output = await completeWith(provider, key, model, {
        system: prompt.system,
        user: prompt.user,
        temperature: prompt.temperature,
        maxTokens: prompt.maxTokens,
      });

      return NextResponse.json({
        output,
        provider,
        model,
        expectsReport: prompt.expectsReport,
        truncated,
        fallbackUsed: provider !== requested,
        note: truncated
          ? `Naskah dipotong pada ${MAX_INPUT_CHARS.toLocaleString("id-ID")} karakter agar sesuai batas model.`
          : undefined,
      });
    } catch (err) {
      const message = err instanceof ProviderError ? err.message : String(err);
      errors.push(`${provider}: ${message}`);
    }
  }

  const needsConfiguration = errors.every((e) => e.includes("belum dikonfigurasi"));

  if (needsConfiguration) {
    return jsonError(
      "Belum ada provider AI yang terhubung. Buka AI Settings untuk menambahkan API key.",
      412,
      { needsConfiguration: true, details: errors }
    );
  }

  return jsonError(
    `Semua provider gagal memproses permintaan. ${errors.join(" · ")}`,
    502,
    { details: errors }
  );
}
