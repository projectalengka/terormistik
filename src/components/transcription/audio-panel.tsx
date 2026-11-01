"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AudioLines,
  Check,
  FileAudio,
  Loader2,
  Save,
  Sparkles,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { useRepo } from "@/components/providers/data-provider";
import { useToast } from "@/components/ui/toast";
import { useProviders } from "@/lib/use-providers";
import { convertNoteToStory } from "@/lib/note-actions";
import {
  countWords,
  formatBytes,
  formatDuration,
  formatNumber,
  isAudioFile,
} from "@/lib/utils";
import { MAX_AUDIO_BYTES } from "@/lib/constants";
import type { MediaSource } from "@/lib/types";

type Phase = "idle" | "ready" | "working" | "done" | "error";

function uploadWithProgress(
  form: FormData,
  onProgress: (percent: number) => void
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/transcribe");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      let json: Record<string, unknown> = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        json = { error: "Respons server tidak terbaca." };
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, json });
    };
    xhr.onerror = () => reject(new Error("Koneksi ke server gagal."));
    xhr.ontimeout = () => reject(new Error("Waktu unggah habis."));
    xhr.timeout = 300_000;
    xhr.send(form);
  });
}

export function AudioPanel({ onSaved }: { onSaved: () => void }) {
  const repo = useRepo();
  const router = useRouter();
  const toast = useToast();
  const { providers } = useProviders();

  const groqReady = providers.find((p) => p.id === "groq")?.configured ?? false;
  const geminiReady = providers.find((p) => p.id === "gemini")?.configured ?? false;

  const [file, setFile] = React.useState<File | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [transcript, setTranscript] = React.useState("");
  const [media, setMedia] = React.useState<MediaSource | null>(null);
  const [provider, setProvider] = React.useState<"groq" | "gemini">("groq");
  const [language, setLanguage] = React.useState("id");
  const [dragging, setDragging] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [duration, setDuration] = React.useState<number | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!groqReady && geminiReady) setProvider("gemini");
  }, [groqReady, geminiReady]);

  React.useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  function pickFile(next: File | null) {
    setError(null);
    if (!next) return;
    if (!isAudioFile(next)) {
      setError("Berkas ini bukan audio yang didukung. Gunakan MP3, WAV, M4A, atau WebM.");
      return;
    }
    if (next.size > MAX_AUDIO_BYTES) {
      setError(`Ukuran berkas melebihi ${Math.round(MAX_AUDIO_BYTES / 1024 / 1024)} MB.`);
      return;
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setFile(next);
    setAudioUrl(URL.createObjectURL(next));
    setTranscript("");
    setMedia(null);
    setProgress(0);
    setDuration(null);
    setPhase("ready");
  }

  async function transcribe() {
    if (!file) return;
    setPhase("working");
    setProgress(0);
    setError(null);

    try {
      const created = await repo.createMedia({
        kind: "audio",
        file_name: file.name,
        mime_type: file.type || "audio/mpeg",
        size_bytes: file.size,
        transcript_status: "processing",
      });
      setMedia(created);

      const form = new FormData();
      form.append("file", file);
      form.append("provider", provider);
      form.append("language", language);

      const result = await uploadWithProgress(form, setProgress);

      if (!result.ok) {
        const message = String(result.json.error ?? "Transkripsi gagal.");
        setError(message);
        await repo.updateMedia(created.id, { transcript_status: "error" });
        setPhase("error");
        return;
      }

      const text = String(result.json.text ?? "");
      const detectedDuration =
        typeof result.json.duration === "number" ? result.json.duration : null;

      setTranscript(text);
      setDuration(detectedDuration);

      const updated = await repo.updateMedia(created.id, {
        transcript: text,
        transcript_status: "done",
        provider: String(result.json.provider ?? provider),
        duration_seconds: detectedDuration,
      });
      setMedia(updated);
      setPhase("done");
      toast.success("Transkripsi selesai.");

      // Archive the binary in the background so the transcript is never lost.
      try {
        const upload = await repo.uploadMedia(file, "audio");
        const withPath = await repo.updateMedia(created.id, { storage_path: upload.path });
        setMedia(withPath);
      } catch {
        toast.info("Transkrip tersimpan, tetapi berkas audio gagal diarsipkan.");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transkripsi gagal.");
      setPhase("error");
    }
  }

  async function saveToArchive() {
    if (!transcript.trim()) return;
    setSaving(true);
    try {
      if (media) await repo.updateMedia(media.id, { transcript });
      await repo.createNote({
        title: file ? file.name.replace(/\.[^.]+$/, "") : "Transkripsi audio",
        body: transcript.trim(),
        method: "audio",
        status: "raw",
        media_id: media?.id ?? null,
      });
      toast.success("Transkrip disimpan ke arsip catatan.");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function sendToStudio() {
    if (!transcript.trim()) return;
    setSaving(true);
    try {
      const note = await repo.createNote({
        title: file ? file.name.replace(/\.[^.]+$/, "") : "Transkripsi audio",
        body: transcript.trim(),
        method: "audio",
        status: "converted",
        media_id: media?.id ?? null,
      });
      const story = await convertNoteToStory(repo, note);
      toast.success("Transkrip dibuka di Writing Studio.");
      router.push(`/studio/${story.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuka di studio.");
    } finally {
      setSaving(false);
    }
  }

  const busy = phase === "working";
  const noProvider = !groqReady && !geminiReady;

  return (
    <div className="space-y-4">
      {/* Dropzone */}
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
          if (dropped) pickFile(dropped);
        }}
        className={`rounded-[5px] border border-dashed px-5 py-8 text-center transition-colors ${
          dragging ? "border-accent bg-accent/[0.04]" : "border-line bg-[#15151B]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac,.aac"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white/[0.02] text-[#8A8073]">
          <FileAudio className="h-5 w-5" />
        </div>
        <p className="font-serif text-[18px] text-parchment">
          {file ? file.name : "Letakkan berkas audio di sini"}
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-[11.5px] leading-relaxed text-faint">
          MP3, WAV, M4A, WebM · maksimal {Math.round(MAX_AUDIO_BYTES / 1024 / 1024)} MB
          {file && ` · ${formatBytes(file.size)}`}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> {file ? "Ganti Berkas" : "Pilih Berkas"}
          </Button>
          {file && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFile(null);
                setPhase("idle");
                setTranscript("");
                setMedia(null);
                if (audioUrl) URL.revokeObjectURL(audioUrl);
                setAudioUrl(null);
              }}
            >
              <X className="h-3.5 w-3.5" /> Hapus
            </Button>
          )}
        </div>
      </div>

      {audioUrl && (
        <div className="rounded-[4px] border border-line bg-[#15151B] p-4">
          <p className="eyebrow mb-2">Pratinjau audio</p>
          <audio controls src={audioUrl} className="h-9 w-full" />
        </div>
      )}

      {noProvider && (
        <div className="flex items-start gap-2.5 rounded-[4px] border border-[#4E3F2A] bg-[#1C1A14] px-3.5 py-3">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D6B98A]" />
          <div>
            <p className="text-[12px] text-[#D6B98A]">Belum ada provider transkripsi terhubung</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#9A8A6E]">
              Tambahkan Groq Whisper atau Gemini API key untuk mengaktifkan transkripsi.
            </p>
            <a
              href="/settings/ai"
              className="mt-1.5 inline-block text-[11px] text-[#D6B98A] underline underline-offset-2"
            >
              Buka AI Settings →
            </a>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 rounded-[4px] border border-line bg-[#15151B] p-4">
        <div className="w-full sm:w-[180px]">
          <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted">Provider</p>
          <Select value={provider} onChange={(e) => setProvider(e.target.value as "groq" | "gemini")}>
            <option value="groq">Groq Whisper {groqReady ? "" : "(belum)"}</option>
            <option value="gemini">Gemini {geminiReady ? "" : "(belum)"}</option>
          </Select>
        </div>
        <div className="w-full sm:w-[150px]">
          <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted">Bahasa</p>
          <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="id">Indonesia</option>
            <option value="en">Inggris</option>
            <option value="auto">Deteksi otomatis</option>
          </Select>
        </div>
        <div className="ml-auto">
          <Button
            variant="primary"
            onClick={() => void transcribe()}
            disabled={!file || busy || noProvider}
            loading={busy}
          >
            <AudioLines className="h-4 w-4" /> Mulai Transkripsi
          </Button>
        </div>
      </div>

      {/* Progress */}
      {busy && (
        <div className="rounded-[4px] border border-line bg-[#111116] px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-2 text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-soft" />
              {progress < 100 ? "Mengunggah audio…" : "Menranskripsi…"}
            </span>
            <span className="text-faint">{progress}%</span>
          </div>
          <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full bg-accent transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-[3px] border border-[#5A2B2B] bg-[#221618] px-3.5 py-2.5">
          <TriangleAlert className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[#D98A8A]" />
          <p className="text-[12px] leading-relaxed text-[#E7BFBF]">{error}</p>
        </div>
      )}

      {/* Result */}
      {phase === "done" && (
        <div className="rounded-[5px] border border-line bg-[#15151B]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-[#6FA37F]" />
              <p className="text-[12px] text-parchment">Transkripsi selesai</p>
            </div>
            <div className="flex items-center gap-3 text-[10.5px] text-faint">
              <span>{formatNumber(countWords(transcript))} kata</span>
              {duration && <span>· {formatDuration(duration)}</span>}
            </div>
          </div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={12}
            className="w-full resize-y bg-transparent px-4 py-4 text-[13.5px] leading-[1.85] text-[#D6C9B4] outline-none"
            placeholder="Transkrip akan muncul di sini…"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
            <p className="text-[10.5px] text-faint">Perbaiki kesalahan langsung di kotak teks.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => void saveToArchive()} loading={saving}>
                <Save className="h-3.5 w-3.5" /> Simpan ke Arsip
              </Button>
              <Button variant="primary" size="sm" onClick={() => void sendToStudio()} loading={saving}>
                <Sparkles className="h-3.5 w-3.5" /> Kirim ke Studio
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
