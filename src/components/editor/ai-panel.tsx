"use client";

import * as React from "react";
import {
  AlignLeft,
  Check,
  Columns2,
  Flame,
  GitBranch,
  History,
  List,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
  Type,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { useRepo } from "@/components/providers/data-provider";
import { AI_ACTIONS } from "@/lib/constants";
import { cn, formatDateShort, truncate } from "@/lib/utils";
import { DiffView } from "./diff-view";
import type { AiActionId, AiMode, StoryVersion } from "@/lib/types";

const ICONS: Record<string, React.ElementType> = {
  sparkles: Sparkles,
  quote: AlignLeft,
  flame: Flame,
  "git-branch": GitBranch,
  list: List,
  "align-left": AlignLeft,
  type: Type,
  "shield-check": ShieldCheck,
};

interface AiResult {
  action: AiActionId;
  output: string;
  provider: string;
  model: string;
  expectsReport: boolean;
  truncated: boolean;
}

export function AiPanel({
  storyId,
  chapterId,
  title,
  getText,
  onAccept,
  onSaveVersion,
  onChapters,
  versions,
  onRestore,
  onRefreshVersions,
}: {
  storyId: string;
  chapterId: string | null;
  title: string;
  getText: () => string;
  onAccept: (output: string) => Promise<void>;
  onSaveVersion: (output: string, action: AiActionId) => Promise<void>;
  onChapters: (output: string) => Promise<void>;
  versions: StoryVersion[];
  onRestore: (version: StoryVersion) => Promise<void>;
  onRefreshVersions: () => void;
}) {
  const repo = useRepo();
  const toast = useToast();

  const [tab, setTab] = React.useState<"actions" | "history">("actions");
  const [mode, setMode] = React.useState<AiMode>("natural");
  const [running, setRunning] = React.useState<AiActionId | null>(null);
  const [result, setResult] = React.useState<AiResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [needsConfig, setNeedsConfig] = React.useState(false);
  const [showDiff, setShowDiff] = React.useState(false);
  const [original, setOriginal] = React.useState("");

  async function run(actionId: AiActionId) {
    const text = getText();
    if (!text.trim()) {
      setError("Bab ini masih kosong. Tulis atau tempel naskah terlebih dahulu.");
      return;
    }

    setRunning(actionId);
    setError(null);
    setNeedsConfig(false);
    setResult(null);
    setShowDiff(false);
    setOriginal(text);

    const meta = AI_ACTIONS.find((a) => a.id === actionId);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionId,
          mode: meta?.mode ?? mode,
          text,
          title,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Permintaan AI gagal.");
        if (json.needsConfiguration) setNeedsConfig(true);
        toast.error(json.error ?? "Permintaan AI gagal.");
        return;
      }

      setResult({
        action: actionId,
        output: json.output,
        provider: json.provider,
        model: json.model,
        expectsReport: Boolean(json.expectsReport),
        truncated: Boolean(json.truncated),
      });

      await repo
        .createAiHistory({
          story_id: storyId,
          note_id: null,
          action: actionId,
          provider: json.provider,
          model: json.model,
          mode: meta?.mode ?? mode,
          input_excerpt: truncate(text, 400),
          output: json.output,
        })
        .catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permintaan AI gagal.");
    } finally {
      setRunning(null);
    }
  }

  async function accept() {
    if (!result) return;
    try {
      if (result.action === "chapters") {
        await onChapters(result.output);
      } else {
        await onAccept(result.output);
        await onSaveVersion(result.output, result.action);
      }
      toast.success("Hasil AI diterapkan pada naskah.");
      setResult(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menerapkan hasil.");
    }
  }

  async function saveVersion() {
    if (!result) return;
    try {
      await onSaveVersion(result.output, result.action);
      toast.success("Versi baru disimpan tanpa mengubah naskah.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan versi.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-line px-3 py-2">
        <button
          onClick={() => setTab("actions")}
          className={cn(
            "flex items-center gap-1.5 rounded-[3px] px-2.5 py-1.5 text-[11.5px] transition-colors",
            tab === "actions" ? "bg-white/[0.05] text-parchment" : "text-faint hover:text-muted"
          )}
        >
          <Sparkles className="h-3 w-3" /> Aksi AI
        </button>
        <button
          onClick={() => setTab("history")}
          className={cn(
            "flex items-center gap-1.5 rounded-[3px] px-2.5 py-1.5 text-[11.5px] transition-colors",
            tab === "history" ? "bg-white/[0.05] text-parchment" : "text-faint hover:text-muted"
          )}
        >
          <History className="h-3 w-3" /> Riwayat
          {versions.length > 0 && (
            <span className="rounded-full bg-white/[0.08] px-1.5 text-[9.5px] text-muted">
              {versions.length}
            </span>
          )}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "actions" ? (
          <div className="p-3">
            {/* Mode */}
            <p className="eyebrow mb-2 px-1">Mode pengolahan</p>
            <div className="mb-1 grid grid-cols-2 gap-1 rounded-[4px] border border-line bg-[#111116] p-1">
              {(
                [
                  { id: "natural", label: "Natural", hint: "Gaya asli dijaga" },
                  { id: "professional", label: "Profesional", hint: "Novel horor" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setMode(item.id)}
                  className={cn(
                    "rounded-[3px] px-2 py-1.5 text-left transition-colors",
                    mode === item.id
                      ? "bg-accent/15 text-[#E2A3A3]"
                      : "text-faint hover:bg-white/[0.03] hover:text-muted"
                  )}
                >
                  <span className="block text-[11.5px] font-medium">{item.label}</span>
                  <span className="mt-0.5 block text-[9.5px] opacity-70">{item.hint}</span>
                </button>
              ))}
            </div>
            <p className="mb-4 px-1 text-[10.5px] leading-relaxed text-faint">
              {mode === "natural"
                ? "AI merapikan ejaan, tanda baca, dan paragraf. Inti cerita dan gaya bicara asli tidak diubah."
                : "AI memperkuat suasana, ketegangan, karakter, dan alur tanpa mengubah peristiwa utama."}
            </p>

            {error && (
              <div className="mb-3 rounded-[3px] border border-[#5A2B2B] bg-[#221618] px-3 py-2.5">
                <p className="text-[11.5px] leading-relaxed text-[#E7BFBF]">{error}</p>
                {needsConfig && (
                  <a
                    href="/settings/ai"
                    className="mt-2 inline-block text-[11px] text-[#D6B98A] underline underline-offset-2"
                  >
                    Buka AI Settings →
                  </a>
                )}
              </div>
            )}

            <p className="eyebrow mb-2 px-1">Aksi</p>
            <div className="grid grid-cols-1 gap-1.5">
              {AI_ACTIONS.map((action) => {
                const Icon = ICONS[action.icon] ?? Sparkles;
                const isRunning = running === action.id;
                return (
                  <button
                    key={action.id}
                    onClick={() => void run(action.id)}
                    disabled={Boolean(running)}
                    className={cn(
                      "group flex items-start gap-2.5 rounded-[4px] border border-line/70 bg-[#15151B] px-2.5 py-2 text-left transition-all duration-200",
                      "hover:border-line-strong hover:bg-[#191920] disabled:opacity-45",
                      isRunning && "border-[#5A2B2B] bg-[#1C1416]"
                    )}
                  >
                    <span className="mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] border border-line/70 bg-white/[0.02] text-[#8A8073] group-hover:text-accent-soft">
                      {isRunning ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Icon className="h-3 w-3" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12px] font-medium text-parchment">
                        {action.label}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] leading-relaxed text-[#8A8073]">
                        {action.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {running && (
              <div className="mt-3 flex items-center gap-2 rounded-[3px] border border-line bg-[#111116] px-3 py-2.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-soft" />
                <p className="text-[11.5px] text-muted">
                  {AI_ACTIONS.find((a) => a.id === running)?.label}… menulis.
                </p>
              </div>
            )}

            {result && (
              <div className="mt-3 overflow-hidden rounded-[4px] border border-[#3E2E2E] bg-[#151113]">
                <div className="flex items-center justify-between gap-2 border-b border-[#3E2E2E] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] font-medium text-parchment">
                      {AI_ACTIONS.find((a) => a.id === result.action)?.label}
                    </p>
                    <p className="mt-0.5 truncate text-[9.5px] text-faint">
                      {result.provider} · {result.model}
                    </p>
                  </div>
                  <button
                    onClick={() => setResult(null)}
                    aria-label="Tutup hasil"
                    className="shrink-0 p-1 text-faint hover:text-parchment"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto px-3 py-3">
                  {showDiff ? (
                    <DiffView original={original} revised={result.output} view="inline" />
                  ) : (
                    <p className="whitespace-pre-wrap text-[12px] leading-[1.85] text-[#C9BFAF]">
                      {result.output}
                    </p>
                  )}
                </div>

                {result.truncated && (
                  <p className="border-t border-[#3E2E2E] px-3 py-1.5 text-[10px] text-[#D6B98A]">
                    Naskah dipotong agar sesuai batas model. Proses per bab untuk hasil penuh.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-1.5 border-t border-[#3E2E2E] px-3 py-2.5">
                  <button
                    onClick={() => setShowDiff((v) => !v)}
                    className={cn(
                      "flex items-center gap-1 rounded-[3px] border border-line px-2 py-1 text-[10.5px] transition-colors",
                      showDiff ? "bg-white/[0.06] text-parchment" : "text-muted hover:text-parchment"
                    )}
                  >
                    <Columns2 className="h-3 w-3" /> Bandingkan
                  </button>
                  {!result.expectsReport ? (
                    <>
                      <button
                        onClick={() => void accept()}
                        className="flex items-center gap-1 rounded-[3px] bg-accent px-2 py-1 text-[10.5px] text-[#F6EBDD] transition-colors hover:bg-[#B93A3A]"
                      >
                        <Check className="h-3 w-3" /> Terima
                      </button>
                      <button
                        onClick={() => setResult(null)}
                        className="flex items-center gap-1 rounded-[3px] border border-line px-2 py-1 text-[10.5px] text-muted transition-colors hover:text-[#D98A8A]"
                      >
                        <X className="h-3 w-3" /> Tolak
                      </button>
                      <button
                        onClick={() => void saveVersion()}
                        className="flex items-center gap-1 rounded-[3px] border border-line px-2 py-1 text-[10.5px] text-muted transition-colors hover:text-parchment"
                      >
                        <Save className="h-3 w-3" /> Simpan Versi
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => void saveVersion()}
                        className="flex items-center gap-1 rounded-[3px] bg-surface-2 px-2 py-1 text-[10.5px] text-parchment transition-colors hover:bg-surface-3"
                      >
                        <Save className="h-3 w-3" /> Simpan Laporan
                      </button>
                      <span className="text-[9.5px] text-faint">Laporan tidak mengganti naskah.</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="eyebrow">Versi tersimpan</p>
              <button
                onClick={onRefreshVersions}
                className="text-[10px] text-faint hover:text-parchment"
              >
                Muat ulang
              </button>
            </div>
            {versions.length === 0 ? (
              <EmptyState
                icon={<History className="h-4 w-4" />}
                title="Belum ada versi"
                description="Setiap hasil AI yang Anda simpan akan tercatat di sini."
                className="border-0 px-2 py-8"
              />
            ) : (
              <ul className="space-y-1.5">
                {versions.map((version) => (
                  <li
                    key={version.id}
                    className="rounded-[4px] border border-line/70 bg-[#15151B] px-2.5 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-[11.5px] text-parchment">
                        {version.label}
                      </p>
                      <Badge tone={version.source === "ai" ? "accent" : "muted"}>
                        {version.source}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-faint">
                      {truncate(version.content.replace(/[{}"[\]]/g, " "), 110)}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[9.5px] text-faint">
                        {formatDateShort(version.created_at)} · {version.word_count} kata
                      </span>
                      <button
                        onClick={() => void onRestore(version)}
                        className="text-[10px] text-[#C9A98A] hover:text-parchment"
                      >
                        Pulihkan
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
