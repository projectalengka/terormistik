"use client";

import * as React from "react";
import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Shield,
  Trash2,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useProviders, saveProviderKey, removeProviderKey } from "@/lib/use-providers";
import { readAiPrefs, writeAiPrefs, type AiPrefs } from "@/lib/ai-prefs";
import { AI_MODELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ProviderStatus } from "@/lib/types";

const ENV_NAMES: Record<string, string> = {
  openrouter: "OPENROUTER_API_KEY",
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
};

function ProviderCard({
  provider,
  prefs,
  onPrefs,
  onChanged,
}: {
  provider: ProviderStatus;
  prefs: AiPrefs;
  onPrefs: (next: AiPrefs) => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [key, setKey] = React.useState("");
  const [visible, setVisible] = React.useState(false);
  const [busy, setBusy] = React.useState<"save" | "test" | "remove" | null>(null);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [model, setModel] = React.useState(
    prefs.provider === provider.id ? prefs.model : ""
  );

  const isTextProvider = provider.id !== "groq";
  const activeModel = model || provider.defaultModel;

  async function save() {
    if (key.trim().length < 8) {
      setMessage({ ok: false, text: "API key terlalu pendek." });
      return;
    }
    setBusy("save");
    setMessage(null);
    try {
      const result = await saveProviderKey(provider.id, key.trim());
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) {
        toast.success(`${provider.label} tersambung.`);
        setKey("");
        onChanged();
      } else {
        toast.error(result.message);
        onChanged();
      }
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Gagal menyimpan." });
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    setMessage(null);
    try {
      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: provider.id }),
      });
      const json = await res.json();
      setMessage({ ok: Boolean(json.ok), text: json.message ?? "Tidak ada respons." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Pengujian gagal." });
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("remove");
    try {
      const result = await removeProviderKey(provider.id);
      setMessage({ ok: result.ok, text: result.message });
      onChanged();
      toast.success("Kunci dihapus.");
    } finally {
      setBusy(null);
    }
  }

  function setDefaultModel(value: string) {
    setModel(value);
    if (prefs.provider === provider.id) onPrefs({ ...prefs, model: value });
  }

  return (
    <div className="rounded-[5px] border border-line bg-[#15151B]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
              provider.configured ? "bg-[#6FA37F]" : "bg-[#4A4550]"
            )}
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13.5px] font-medium text-parchment">{provider.label}</p>
              {provider.freeTierHint && (
                <Badge tone={provider.freeTierHint.includes("Gratis") ? "success" : "muted"}>
                  {provider.freeTierHint.includes("Gratis") ? "Gratis" : "Berbayar"}
                </Badge>
              )}
              {provider.configured ? (
                <Badge tone="success">
                  {provider.source === "env" ? "ENV" : "Tersimpan"}
                </Badge>
              ) : (
                <Badge tone="muted">Belum terhubung</Badge>
              )}
              {isTextProvider && prefs.provider === provider.id && (
                <Badge tone="accent">Utama</Badge>
              )}
            </div>
            <p className="mt-1 text-[11.5px] text-muted">{provider.purpose}</p>
            {provider.freeTierHint && (
              <p className="mt-0.5 text-[10px] text-faint">
                {provider.freeTierHint}
              </p>
            )}
          </div>
        </div>
        <a
          href={provider.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10.5px] text-faint transition-colors hover:text-parchment"
        >
          Dapatkan kunci <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-muted">
            Model {isTextProvider ? "default" : "transkripsi"}
          </label>
          <Input
            list={`models-${provider.id}`}
            value={activeModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            placeholder={provider.defaultModel}
            className="text-[12.5px]"
          />
          <datalist id={`models-${provider.id}`}>
            {(AI_MODELS[provider.id] ?? provider.models ?? []).map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <p className="mt-1.5 text-[10px] text-faint">
            {isTextProvider
              ? "Daftar di atas adalah saran. Anda dapat menulis nama model lain yang tersedia di provider."
              : "Whisper large-v3 mendukung Bahasa Indonesia dengan baik."}
          </p>
        </div>

        {provider.source !== "env" && (
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-muted">
              API Key
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
                <Input
                  type={visible ? "text" : "password"}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder={provider.configured ? "••••••••••••••••" : "Tempel API key di sini"}
                  className="pl-9 pr-9 text-[12.5px]"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  aria-label={visible ? "Sembunyikan" : "Tampilkan"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-faint hover:text-parchment"
                >
                  {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <Button
                variant="primary"
                onClick={() => void save()}
                loading={busy === "save"}
                disabled={!key.trim()}
              >
                Simpan &amp; Uji
              </Button>
            </div>
          </div>
        )}

        {provider.source === "env" && (
          <div className="rounded-[3px] border border-line bg-[#111116] px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-muted">
              Kunci dibaca dari environment variable{" "}
              <code className="rounded bg-white/[0.06] px-1 py-0.5 text-[10.5px] text-[#D8CBB6]">
                {ENV_NAMES[provider.id]}
              </code>
              . Untuk menggantinya, ubah nilai tersebut lalu mulai ulang server.
            </p>
          </div>
        )}

        {message && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-[3px] border px-3 py-2",
              message.ok
                ? "border-[#2F4E3B] bg-[#182219]"
                : "border-[#5A2B2B] bg-[#221618]"
            )}
          >
            {message.ok ? (
              <Check className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[#9FC7A9]" />
            ) : (
              <TriangleAlert className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[#D98A8A]" />
            )}
            <p
              className={cn(
                "text-[11.5px] leading-relaxed",
                message.ok ? "text-[#C6DCC9]" : "text-[#E7BFBF]"
              )}
            >
              {message.text}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={() => void test()} loading={busy === "test"}>
            <Zap className="h-3.5 w-3.5" /> Uji Koneksi
          </Button>
          {provider.source === "stored" && (
            <Button variant="danger" size="sm" onClick={() => void remove()} loading={busy === "remove"}>
              <Trash2 className="h-3.5 w-3.5" /> Hapus Kunci
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AiSettingsPage() {
  const providers = useProviders();
  const [prefs, setPrefs] = React.useState<AiPrefs>({ provider: "openrouter", model: "", fallback: "gemini" });

  React.useEffect(() => {
    setPrefs(readAiPrefs());
  }, []);

  function updatePrefs(next: AiPrefs) {
    setPrefs(next);
    writeAiPrefs(next);
  }

  const configuredCount = providers.providers.filter((p) => p.configured).length;

  return (
    <>
      <PageHeader
        eyebrow="AI Settings"
        title={
          <>
            Kendali atas <span className="italic text-[#C7B9A3]">mesin penulis.</span>
          </>
        }
        description="Hubungkan provider AI yang Anda miliki. Kunci disimpan di server — tidak pernah dikirim ke peramban, tidak pernah masuk localStorage."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[4px] border border-line bg-[#15151B] px-4 py-3">
        <Shield className="h-4 w-4 shrink-0 text-[#6FA37F]" />
        <p className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-muted">
          <span className="text-parchment">Keamanan:</span> kunci dienkripsi AES-256-GCM di server
          (<code className="text-[10.5px] text-[#C9A98A]">.data/keys.json</code>) atau dibaca dari
          environment variable. Semua permintaan AI melewati backend dengan validasi dan pembatasan
          laju.
        </p>
        <Badge tone={configuredCount > 0 ? "success" : "warn"}>
          {configuredCount}/3 terhubung
        </Badge>
      </div>

      {providers.error && (
        <div className="mb-4 flex items-start gap-2 rounded-[3px] border border-[#5A2B2B] bg-[#221618] px-3 py-2.5">
          <TriangleAlert className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[#D98A8A]" />
          <p className="text-[12px] text-[#E7BFBF]">{providers.error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {providers.loading
          ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-64 w-full" />)
          : providers.providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                prefs={prefs}
                onPrefs={updatePrefs}
                onChanged={() => void providers.refresh()}
              />
            ))}
      </div>

      {/* Routing */}
      <section className="mt-8 rounded-[5px] border border-line bg-[#15151B] p-4 sm:p-5">
        <p className="eyebrow mb-1">Perutean model</p>
        <h2 className="mb-4 font-serif text-[20px] text-parchment">Provider utama &amp; cadangan</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-muted">
              Provider utama (teks)
            </label>
            <Select
              value={prefs.provider}
              onChange={(e) => updatePrefs({ ...prefs, provider: e.target.value as AiPrefs["provider"], model: "" })}
            >
              <option value="openrouter">OpenRouter</option>
              <option value="gemini">Google Gemini</option>
            </Select>
            <p className="mt-1.5 text-[10.5px] text-faint">
              Digunakan untuk seluruh aksi di Writing Studio.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-muted">
              Fallback otomatis
            </label>
            <Select
              value={prefs.fallback}
              onChange={(e) => updatePrefs({ ...prefs, fallback: e.target.value as AiPrefs["fallback"] })}
            >
              <option value="gemini">Gemini</option>
              <option value="openrouter">OpenRouter</option>
              <option value="none">Tanpa fallback</option>
            </Select>
            <p className="mt-1.5 text-[10.5px] text-faint">
              Dicoba otomatis jika provider utama gagal.
            </p>
          </div>
        </div>

        <p className="mt-4 text-[10.5px] leading-relaxed text-faint">
          Catatan: perutean sisi server mengikuti <code>AI_PRIMARY_PROVIDER</code> dan{" "}
          <code>AI_FALLBACK_PROVIDER</code> pada environment. Pilihan di atas disimpan pada perangkat
          ini dan dikirim bersama setiap permintaan.
        </p>
      </section>

      {/* Guide */}
      <section className="mt-8 rounded-[5px] border border-line bg-[#111116] p-4 sm:p-5">
        <p className="eyebrow mb-1">Konfigurasi server</p>
        <h2 className="mb-3 font-serif text-[20px] text-parchment">Environment variable</h2>
        <p className="mb-3 text-[11.5px] leading-relaxed text-muted">
          Untuk deployment (Vercel, VPS), gunakan environment variable. Nilai ini lebih aman dan
          tidak bergantung pada sistem berkas.
        </p>
        <pre className="overflow-x-auto rounded-[4px] border border-line bg-[#0C0C10] p-3.5 text-[11px] leading-[1.8] text-[#C9BFAF]">
{`# Untuk tier gratis, gunakan Gemini sebagai primary:
GEMINI_API_KEY=AIzaSy...
GROQ_API_KEY=gsk_...
AI_PRIMARY_PROVIDER=gemini
AI_FALLBACK_PROVIDER=none
GEMINI_MODEL=gemini-2.5-flash
GROQ_WHISPER_MODEL=whisper-large-v3

# Jika punya kredit OpenRouter, aktifkan:
# OPENROUTER_API_KEY=sk-or-v1-...
# AI_FALLBACK_PROVIDER=openrouter`}
        </pre>
        <div className="mt-3 flex items-start gap-2">
          <Loader2 className="mt-[2px] h-3 w-3 shrink-0 text-faint" />
          <p className="text-[10.5px] leading-relaxed text-faint">
            Setelah mengubah environment variable, mulai ulang server agar nilai baru terbaca.
          </p>
        </div>
      </section>
    </>
  );
}
