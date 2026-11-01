"use client";

import * as React from "react";
import {
  Circle,
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Save,
  Square,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { useRepo } from "@/components/providers/data-provider";
import { useToast } from "@/components/ui/toast";
import { useProviders } from "@/lib/use-providers";
import { countWords, formatDuration, formatNumber } from "@/lib/utils";
import type { MediaSource, Note } from "@/lib/types";

type Phase = "idle" | "recording" | "paused" | "uploading" | "transcribing" | "ready" | "error";

function pickMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export function VoiceRecorder({ onSaved }: { onSaved: (note: Note) => void }) {
  const repo = useRepo();
  const toast = useToast();
  const { providers } = useProviders();
  const groqReady = providers.find((p) => p.id === "groq")?.configured ?? false;

  const [phase, setPhase] = React.useState<Phase>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [seconds, setSeconds] = React.useState(0);
  const [levels, setLevels] = React.useState<number[]>(new Array(32).fill(6));
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
  const [transcript, setTranscript] = React.useState("");
  const [media, setMedia] = React.useState<MediaSource | null>(null);
  const [title, setTitle] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);
  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = React.useRef<File | null>(null);

  const cleanupMeter = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    analyserRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
  }, []);

  const stopTracks = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  React.useEffect(() => {
    return () => {
      cleanupMeter();
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startMeter(stream: MediaStream) {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const bars = new Array(32).fill(0).map((_, i) => {
          const value = data[Math.floor((i / 32) * data.length)] ?? 0;
          return 6 + (value / 255) * 34;
        });
        setLevels(bars);
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      /* visual meter is optional */
    }
  }

  async function startRecording() {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Peramban ini tidak mendukung perekaman audio. Gunakan Chrome, Edge, atau Safari terbaru.");
      setPhase("error");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      startMeter(stream);

      const mime = pickMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        const file = new File([blob], `rekaman-${Date.now()}.webm`, {
          type: blob.type || "audio/webm",
        });
        fileRef.current = file;
        void persistRecording(file);
      };

      recorder.start(1000);
      recorderRef.current = recorder;
      setPhase("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      const message =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Izin mikrofon ditolak. Aktifkan akses mikrofon di pengaturan peramban, lalu coba lagi."
          : err instanceof Error
            ? err.message
            : "Mikrofon tidak dapat diakses.";
      setError(message);
      setPhase("error");
      stopTracks();
      cleanupMeter();
    }
  }

  function pauseRecording() {
    recorderRef.current?.pause();
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("paused");
  }

  function resumeRecording() {
    recorderRef.current?.resume();
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    setPhase("recording");
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
    stopTracks();
    cleanupMeter();
    setPhase("uploading");
  }

  async function persistRecording(file: File) {
    try {
      setPhase("uploading");
      const upload = await repo.uploadMedia(file, "audio");
      const created = await repo.createMedia({
        kind: "audio",
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: upload.path,
        duration_seconds: seconds,
        transcript_status: "pending",
      });
      setMedia(created);

      if (!groqReady) {
        setPhase("ready");
        toast.info("Rekaman tersimpan. Hubungkan Groq Whisper untuk transkripsi otomatis.");
        return;
      }

      await transcribe(file, created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan rekaman.");
      setPhase("error");
    }
  }

  async function transcribe(file: File, target: MediaSource) {
    setPhase("transcribing");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("provider", "groq");
      form.append("language", "id");

      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Transkripsi gagal.");
        setPhase("ready");
        return;
      }

      setTranscript(json.text ?? "");
      const updated = await repo.updateMedia(target.id, {
        transcript: json.text ?? "",
        transcript_status: "done",
        provider: json.provider,
        duration_seconds: json.duration ?? seconds,
      });
      setMedia(updated);
      setPhase("ready");
      toast.success("Transkripsi selesai. Periksa dan simpan sebagai catatan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transkripsi gagal.");
      setPhase("ready");
    }
  }

  async function retryTranscription() {
    if (!fileRef.current || !media) return;
    await transcribe(fileRef.current, media);
  }

  async function saveNote() {
    if (!transcript.trim()) {
      toast.error("Transkrip masih kosong.");
      return;
    }
    setSaving(true);
    try {
      const note = await repo.createNote({
        title: title.trim() || `Rekaman ${new Date().toLocaleDateString("id-ID")}`,
        body: transcript.trim(),
        method: "voice",
        status: "raw",
        media_id: media?.id ?? null,
      });
      if (media) await repo.updateMedia(media.id, { transcript: transcript.trim() });
      onSaved(note);
      toast.success("Catatan dari rekaman tersimpan.");
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan catatan.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
    setTranscript("");
    setTitle("");
    setSeconds(0);
    setMedia(null);
    setError(null);
    setPhase("idle");
    setLevels(new Array(32).fill(6));
    fileRef.current = null;
  }

  const active = phase === "recording";
  const paused = phase === "paused";
  const busy = phase === "uploading" || phase === "transcribing";

  return (
    <div className="rounded-[5px] border border-line bg-[#15151B] p-5 sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Rekaman Suara</p>
          <p className="text-[12.5px] leading-relaxed text-muted">
            Rekam cerita lisan langsung dari mikrofon. Hasilnya disimpan sebagai media dan dapat
            ditranskripsi otomatis.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-serif text-[26px] leading-none tabular-nums text-parchment">
            {formatDuration(seconds)}
          </p>
          <p className="mt-1 text-[9.5px] uppercase tracking-[0.16em] text-faint">
            {active ? "Merekam" : paused ? "Dijeda" : "Durasi"}
          </p>
        </div>
      </div>

      {/* Level meter */}
      <div className="mb-6 flex h-[56px] items-center justify-center gap-[3px] rounded-[3px] border border-line/60 bg-[#111116] px-3">
        {levels.map((h, i) => (
          <span
            key={i}
            className={`w-[3px] rounded-full transition-[height,background-color] duration-100 ${
              active ? "bg-accent/80" : paused ? "bg-[#5A4A4A]" : "bg-[#2E2A33]"
            }`}
            style={{ height: `${active || paused ? h : 6}px` }}
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-[3px] border border-[#5A2B2B] bg-[#221618] px-3 py-2.5">
          <TriangleAlert className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[#D98A8A]" />
          <p className="text-[12px] leading-relaxed text-[#E7BFBF]">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {phase === "idle" || phase === "error" ? (
          <Button variant="primary" onClick={() => void startRecording()}>
            <Mic className="h-4 w-4" /> Mulai Merekam
          </Button>
        ) : null}

        {active && (
          <>
            <Button variant="secondary" onClick={pauseRecording}>
              <Pause className="h-4 w-4" /> Jeda
            </Button>
            <Button variant="primary" onClick={stopRecording}>
              <Square className="h-3.5 w-3.5" /> Selesai
            </Button>
          </>
        )}

        {paused && (
          <>
            <Button variant="secondary" onClick={resumeRecording}>
              <Play className="h-4 w-4" /> Lanjutkan
            </Button>
            <Button variant="primary" onClick={stopRecording}>
              <Square className="h-3.5 w-3.5" /> Selesai
            </Button>
          </>
        )}

        {busy && (
          <div className="flex items-center gap-2.5 text-[12.5px] text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-accent-soft" />
            {phase === "uploading" ? "Menyimpan rekaman…" : "Menranskripsi audio…"}
          </div>
        )}

        {phase === "ready" && (
          <>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> Rekaman Baru
            </Button>
            {!transcript && groqReady && (
              <Button variant="secondary" onClick={() => void retryTranscription()}>
                <Mic className="h-3.5 w-3.5" /> Coba Transkripsi
              </Button>
            )}
          </>
        )}

        {active && (
          <span className="ml-1 flex items-center gap-1.5 text-[11px] text-[#D98A8A]">
            <Circle className="h-2 w-2 animate-pulse fill-current" /> mikrofon aktif
          </span>
        )}
      </div>

      {!groqReady && (
        <p className="mt-4 text-[11px] leading-relaxed text-faint">
          Groq Whisper belum terhubung — rekaman tetap disimpan, tetapi transkripsi otomatis tidak
          tersedia. Atur di AI Settings.
        </p>
      )}

      {blobUrl && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="eyebrow mb-2">Pratinjau</p>
          <audio controls src={blobUrl} className="h-9 w-full" />
        </div>
      )}

      {phase === "ready" && (
        <div className="mt-5 border-t border-line pt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="eyebrow">Transkrip</p>
            <span className="text-[10.5px] text-faint">
              {formatNumber(countWords(transcript))} kata
            </span>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul catatan"
            className="mb-2 w-full rounded-[3px] border border-line bg-[#14141A] px-3 py-2 text-[13px] text-parchment placeholder:text-faint focus:border-[#5C4A45] focus:outline-none"
          />
          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={8}
            placeholder={
              transcript
                ? ""
                : "Transkrip akan muncul di sini. Anda juga dapat menulis manual jika transkripsi tidak tersedia."
            }
            className="text-[13.5px] leading-[1.8]"
          />
          <div className="mt-3 flex justify-end">
            <Button variant="primary" size="sm" onClick={() => void saveNote()} loading={saving}>
              <Save className="h-3.5 w-3.5" /> Simpan sebagai Catatan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
