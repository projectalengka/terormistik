"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Film,
  Link2,
  Loader2,
  Save,
  Sparkles,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useRepo } from "@/components/providers/data-provider";
import { useToast } from "@/components/ui/toast";
import { useProviders } from "@/lib/use-providers";
import { convertNoteToStory } from "@/lib/note-actions";
import { formatBytes } from "@/lib/utils";
import { MAX_VIDEO_BYTES } from "@/lib/constants";
import type { MediaSource } from "@/lib/types";

type Phase = "idle" | "working" | "done" | "error";

export function VideoPanel({ onSaved }: { onSaved: () => void }) {
  const repo = useRepo();
  const router = useRouter();
  const toast = useToast();
  const { providers } = useProviders();
  const geminiReady = providers.find((p) => p.id === "gemini")?.configured ?? false;

  const [mode, setMode] = React.useState<"url" | "file">("url");
  const [url, setUrl] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [output, setOutput] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [keyPoints, setKeyPoints] = React.useState<string[]>([]);
  const [media, setMedia] = React.useState<MediaSource | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function analyze() {
    setError(null);
    setOutput("");
    setSummary("");
    setKeyPoints([]);
    setPhase("working");

    try {
      let response: Response;

      if (mode === "url") {
        if (!/^https?:\/\//i.test(url.trim())) {
          setError("Masukkan URL yang valid, dimulai dengan http:// atau https://.");
          setPhase("error");
          return;
        }
        response = await fetch("/api/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });
      } else {
        if (!file) {
          setError("Pilih berkas video terlebih dahulu.");
          setPhase("error");
          return;
        }
        if (file.size > MAX_VIDEO_BYTES) {
          setError(`Ukuran video melebihi ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB.`);
          setPhase("error");
          return;
        }
        const form = new FormData();
        form.append("file", file);
        response = await fetch("/api/video", { method: "POST", body: form });
      }

      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Analisis video gagal.");
        setPhase("error");
        return;
      }

      setOutput(json.output ?? "");
      setSummary(json.summary ?? "");
      setKeyPoints(Array.isArray(json.keyPoints) ? json.keyPoints : []);
      setPhase("done");

      const created = await repo.createMedia({
        kind: "video",
        file_name: mode === "file" ? (file?.name ?? "video") : (json.source ?? url),
        mime_type: mode === "file" ? (file?.type ?? "video/mp4") : "video/url",
        size_bytes: mode === "file" ? (file?.size ?? 0) : 0,
        source_url: mode === "url" ? url.trim() : null,
        transcript: json.output ?? "",
        transcript_status: "done",
        summary: json.summary ?? "",
        key_points: Array.isArray(json.keyPoints) ? json.keyPoints : [],
        provider: "gemini",
      });
      setMedia(created);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analisis video gagal.");
      setPhase("error");
    }
  }

  async function saveAsNote(openStudio = false) {
    if (!output.trim()) return;
    setSaving(true);
    try {
      const note = await repo.createNote({
        title:
          mode === "file"
            ? (file?.name ?? "Analisis video")
            : `Analisis video ${new Date().toLocaleDateString("id-ID")}`,
        body: output.trim(),
        method: "video",
        status: openStudio ? "converted" : "raw",
        media_id: media?.id ?? null,
      });
      if (openStudio) {
        const story = await convertNoteToStory(repo, note);
        toast.success("Bahan cerita dibuka di studio.");
        router.push(`/studio/${story.id}`);
        return;
      }
      toast.success("Hasil analisis disimpan sebagai catatan.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[5px] border border-line bg-[#15151B] p-4 sm:p-5">
        <div className="mb-4 flex gap-1 rounded-[4px] border border-line bg-[#111116] p-0.5">
          {(
            [
              { id: "url", label: "URL Video", icon: Link2 },
              { id: "file", label: "Unggah Berkas", icon: Upload },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setMode(item.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-[3px] px-3 py-2 text-[11.5px] transition-colors ${
                mode === item.id ? "bg-white/[0.06] text-parchment" : "text-faint hover:text-muted"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" /> {item.label}
            </button>
          ))}
        </div>

        {mode === "url" ? (
          <div>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=… atau tautan langsung ke berkas video"
            />
            <p className="mt-2 text-[10.5px] leading-relaxed text-faint">
              Video YouTube publik diproses langsung. Tautan lain akan diunduh oleh server terlebih
              dahulu — pastikan tautan dapat diakses tanpa login.
            </p>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) setFile(dropped);
            }}
            className={`rounded-[4px] border border-dashed px-4 py-6 text-center transition-colors ${
              dragging ? "border-accent bg-accent/[0.04]" : "border-line"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/*,.mp4,.mov,.mkv,.webm,.m4v"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Film className="mx-auto mb-2 h-5 w-5 text-[#5F584C]" />
            <p className="text-[12.5px] text-parchment">
              {file ? file.name : "Letakkan berkas video di sini"}
            </p>
            <p className="mt-1 text-[10.5px] text-faint">
              MP4, MOV, MKV, WebM · maksimal {Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB
              {file && ` · ${formatBytes(file.size)}`}
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" /> Pilih Video
            </Button>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-[10.5px] leading-relaxed text-faint">
            Analisis menghasilkan ringkasan, poin penting, dan bahan cerita orisinal — bukan salinan
            naskah. Hormati hak cipta karya orang lain.
          </p>
          <Button
            variant="primary"
            onClick={() => void analyze()}
            loading={phase === "working"}
            disabled={!geminiReady || (mode === "url" ? !url.trim() : !file)}
          >
            <Sparkles className="h-4 w-4" /> Analisis Video
          </Button>
        </div>

        {!geminiReady && (
          <div className="mt-3 flex items-start gap-2 rounded-[3px] border border-[#4E3F2A] bg-[#1C1A14] px-3 py-2.5">
            <TriangleAlert className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[#D6B98A]" />
            <p className="text-[11px] leading-relaxed text-[#C9B08A]">
              Pemrosesan video memerlukan Gemini API key.{" "}
              <a href="/settings/ai" className="underline underline-offset-2">
                Atur di AI Settings
              </a>
              .
            </p>
          </div>
        )}
      </div>

      {phase === "working" && (
        <div className="flex items-center gap-3 rounded-[4px] border border-line bg-[#111116] px-4 py-4">
          <Loader2 className="h-4 w-4 animate-spin text-accent-soft" />
          <div>
            <p className="text-[12px] text-parchment">Memproses video…</p>
            <p className="mt-0.5 text-[10.5px] text-faint">
              Mengunggah, menonton, lalu menyusun bahan cerita. Ini bisa memakan waktu beberapa menit.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-[3px] border border-[#5A2B2B] bg-[#221618] px-3.5 py-2.5">
          <TriangleAlert className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[#D98A8A]" />
          <p className="text-[12px] leading-relaxed text-[#E7BFBF]">{error}</p>
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-3">
          <div className="rounded-[5px] border border-line bg-[#15151B] p-4">
            <div className="mb-2 flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-[#6FA37F]" />
              <p className="eyebrow">Ringkasan</p>
            </div>
            <p className="text-[13px] leading-[1.8] text-[#C9BFAF]">{summary || "—"}</p>

            {keyPoints.length > 0 && (
              <>
                <p className="eyebrow mb-2 mt-4">Poin penting</p>
                <ul className="space-y-1.5">
                  {keyPoints.map((point, i) => (
                    <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-[#B9AE9D]">
                      <span className="mt-[2px] text-accent">·</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="rounded-[5px] border border-line bg-[#15151B]">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="eyebrow">Bahan cerita lengkap</p>
              <span className="text-[10px] text-faint">dapat diedit</span>
            </div>
            <textarea
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              rows={12}
              className="w-full resize-y bg-transparent px-4 py-4 text-[13px] leading-[1.85] text-[#D6C9B4] outline-none"
            />
            <div className="flex flex-wrap justify-end gap-2 border-t border-line px-4 py-3">
              <Button variant="secondary" size="sm" onClick={() => void saveAsNote(false)} loading={saving}>
                <Save className="h-3.5 w-3.5" /> Simpan Catatan
              </Button>
              <Button variant="primary" size="sm" onClick={() => void saveAsNote(true)} loading={saving}>
                <Sparkles className="h-3.5 w-3.5" /> Kirim ke Studio
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
