import { NextResponse } from "next/server";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";
import { providerStatuses, primaryProvider, fallbackProvider } from "@/lib/server/registry";

export const runtime = "nodejs";

export async function GET() {
  const providers = await providerStatuses();
  return NextResponse.json({
    ok: true,
    app: "TEROR MISTIK",
    version: "1.0.0",
    time: new Date().toISOString(),
    backend: isSupabaseServerConfigured() ? "supabase" : "local",
    ai: {
      primary: primaryProvider(),
      fallback: fallbackProvider(),
      providers: providers.map((p) => ({
        id: p.id,
        configured: p.configured,
        source: p.source,
      })),
    },
  });
}
