import "server-only";

import { getServerUser, isSupabaseServerConfigured } from "../supabase/server";

const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter: number; remaining: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - hits[0])) / 1000);
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.max(1, retryAfter), remaining: 0 };
  }

  hits.push(now);
  buckets.set(key, hits);

  if (buckets.size > 500) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t > windowMs)) buckets.delete(k);
    }
  }

  return { ok: true, retryAfter: 0, remaining: limit - hits.length };
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return Response.json({ error: message, ...extra }, { status });
}

/**
 * When Supabase is configured, AI and provider endpoints require an owner session.
 * In local mode (no Supabase) the app is a single-owner desktop tool.
 */
export async function requireOwner(): Promise<{ ok: true } | { ok: false; response: Response }> {
  if (!isSupabaseServerConfigured()) return { ok: true };
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      response: jsonError("Sesi tidak valid. Silakan masuk kembali.", 401),
    };
  }
  return { ok: true };
}
