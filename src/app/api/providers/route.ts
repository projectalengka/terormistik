import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, jsonError, rateLimit, requireOwner } from "@/lib/server/guard";
import { keysWritable, removeKey, resolveKey, saveKey, type ProviderId } from "@/lib/server/secrets";
import { providerStatuses, fallbackProvider, primaryProvider } from "@/lib/server/registry";
import { testProviderConnection } from "@/lib/server/ai";

export const runtime = "nodejs";

const providerEnum = z.enum(["openrouter", "gemini", "groq"]);

export async function GET() {
  const guard = await requireOwner();
  if (!guard.ok) return guard.response;

  const [providers, writable] = await Promise.all([providerStatuses(), keysWritable()]);
  return NextResponse.json({
    providers,
    writable,
    primary: primaryProvider(),
    fallback: fallbackProvider(),
  });
}

const saveSchema = z.object({
  provider: providerEnum,
  apiKey: z.string().min(8).max(400),
  test: z.boolean().optional(),
});

export async function POST(req: Request) {
  const guard = await requireOwner();
  if (!guard.ok) return guard.response;

  const limit = rateLimit(`providers:${clientIp(req)}`, 20, 60_000);
  if (!limit.ok) {
    return jsonError("Terlalu banyak permintaan. Coba lagi sebentar.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Data tidak valid. Periksa kembali provider dan API key.", 400);
  }

  const provider = parsed.data.provider as ProviderId;

  try {
    await saveKey(provider, parsed.data.apiKey);
  } catch {
    return jsonError(
      "Kunci tidak dapat disimpan di server ini (sistem berkas hanya-baca). Gunakan environment variable.",
      500
    );
  }

  let test: { ok: boolean; message: string; models?: string[] } | null = null;
  if (parsed.data.test !== false) {
    test = await testProviderConnection(provider, parsed.data.apiKey);
  }

  return NextResponse.json({ saved: true, test, providers: await providerStatuses() });
}

export async function DELETE(req: Request) {
  const guard = await requireOwner();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const parsed = providerEnum.safeParse(url.searchParams.get("provider"));
  if (!parsed.success) return jsonError("Provider tidak dikenal.", 400);

  const provider = parsed.data as ProviderId;
  const { source } = await resolveKey(provider);
  if (source === "env") {
    return jsonError(
      "Kunci berasal dari environment variable dan tidak dapat dihapus dari antarmuka.",
      409
    );
  }

  await removeKey(provider);
  return NextResponse.json({ removed: true, providers: await providerStatuses() });
}
