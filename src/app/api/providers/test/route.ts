import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, jsonError, rateLimit, requireOwner } from "@/lib/server/guard";
import { resolveKey, type ProviderId } from "@/lib/server/secrets";
import { testProviderConnection } from "@/lib/server/ai";

export const runtime = "nodejs";

const schema = z.object({
  provider: z.enum(["openrouter", "gemini", "groq"]),
});

export async function POST(req: Request) {
  const guard = await requireOwner();
  if (!guard.ok) return guard.response;

  const limit = rateLimit(`provider-test:${clientIp(req)}`, 20, 60_000);
  if (!limit.ok) return jsonError("Terlalu banyak pengujian. Coba lagi sebentar.", 429);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Provider tidak dikenal.", 400);

  const provider = parsed.data.provider as ProviderId;
  const { key, source } = await resolveKey(provider);

  if (!key) {
    return NextResponse.json({
      ok: false,
      message: "Belum ada API key untuk provider ini.",
      source: null,
    });
  }

  const result = await testProviderConnection(provider, key);
  return NextResponse.json({ ...result, source });
}
