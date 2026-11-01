"use client";

import * as React from "react";
import { Circle, Mic, Pause, Play, Save, Square, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { useRepo } from "@/components/providers/data-provider";
import { useToast } from "@/components/ui/toast";
import { countWords, formatNumber } from "@/lib/utils";
import type { Note } from "@/lib/types";

interface SRAlternative {
  transcript: string;
  confidence: number;
}
interface SRResult {
  isFinal: boolean;
  length: number;
  [index: number]: SRAlternative;
}
interface SRResultList {
  length: number;
  [index: number]: SRResult;
}
interface SREvent extends Event {
  resultIndex: number;
  results: SRResultList;
}
interface SRErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SREvent) => void) | null;
  onerror: ((event: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SRConstructor = new () => SpeechRecognitionLike;

type Phase = "idle" | "listening" | "paused" | "ready";

export function SpeechCapture({
  onSaved,
  onFallback,
}: {
  onSaved: (note: Note) => void;
  onFallback: () => void;
}) {
  const repo = useRepo();
  const toast = useToast();

  const [supported, setSupported] = React.useState<boolean | null>(null);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [finalText, setFinalText] = React.useState("");
  const [interim, setInterim] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);

  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const wantListeningRef = React.useRef(false);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: SRConstructor;
      webkitSpeechRecognition?: SRConstructor;
    };
    setSupported(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));
  }, []);

  React.useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      recognitionRef.current?.abort();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function createRecognition(): SpeechRecognitionLike | null {
    const w = window as unknown as {
      SpeechRecognition?: SRConstructor;
      webkitSpeechRecognition?: SRConstructor;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return null;

    const recognition = new Ctor();
    recognition.lang = "id-ID";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) finalChunk += `${text} `;
        else interimChunk += text;
      }
      if (finalChunk) setFinalText((prev) => (prev ? `${prev}${finalChunk}` : finalChunk));
      setInterim(interimChunk);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Izin mikrofon ditolak. Aktifkan akses mikrofon di pengaturan peramban.");
        wantListeningRef.current = false;
        setPhase("paused");
      } else if (event.error === "no-speech") {
        // Ignore: recognition will restart automatically.
      } else if (event.error === "network") {
        setError("Pengenalan suara membutuhkan koneksi internet.");
      }
    };

    recognition.onend = () => {
      if (wantListeningRef.current) {
        try {
          recognition.start();
        } catch {
          /* already started */
        }
      }
    };

    return recognition;
  }

  function start() {
    setError(null);
    const recognition = recognitionRef.current ?? createRecognition();
    if (!recognition) {
      setError("Peramban ini tidak mendukung Web Speech API.");
      return;
    }
    recognitionRef.current = recognition;
    wantListeningRef.current = true;
    try {
      recognition.start();
      setPhase("listening");
      if (!timerRef.current) {
        timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      }
    } catch {
      setError("Pengenalan suara gagal dimulai. Coba muat ulang halaman.");
    }
  }

  function pause() {
    wantListeningRef.current = false;
    recognitionRef.current?.stop();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPhase("paused");
  }

  function finish() {
    wantListeningRef.current = false;
    recognitionRef.current?.stop();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setInterim("");
    setPhase("ready");
  }

  function reset() {
    wantListeningRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setFinalText("");
    setInterim("");
    setElapsed(0);
    setTitle("");
    setError(null);
    setPhase("idle");
  }

  async function saveNote() {
    const body = finalText.trim();
    if (!body) {
      toast.error("Belum ada transkrip untuk disimpan.");
      return;
    }
    setSaving(true);
    try {
      const note = await repo.createNote({
        title: title.trim() || `Voice note ${new Date().toLocaleDateString("id-ID")}`,
        body,
        method: "speech",
        status: "raw",
      });
      onSaved(note);
      toast.success("Transkrip tersimpan sebagai catatan mentah.");
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan catatan.");
    } finally {
      setSaving(false);
    }
  }

  if (supported === false) {
    return (
      <div className="rounded-[5px] border border-line bg-[#15151B] p-6">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#D6B98A]" />
          <div>
            <p className="text-[14px] text-parchment">
              Peramban ini belum mendukung pengenalan suara langsung
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              Web Speech API tersedia di Chrome, Edge, dan Safari versi terbaru. Sebagai gantinya,
              gunakan perekaman suara lalu transkripsi melalui Groq Whisper — hasilnya sama, hanya
              satu langkah lebih.
            </p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={onFallback}>
              <Mic className="h-3.5 w-3.5" /> Buka Perekam Suara
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const listening = phase === "listening";

  return (
    <div className="rounded-[5px] border border-line bg-[#15151B] p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Voice-to-Text</p>
          <p className="text-[12.5px] leading-relaxed text-muted">
            Bicara langsung, teks muncul seketika. Cocok untuk menangkap cerita sebelum lupa.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-serif text-[26px] leading-none tabular-nums text-parchment">
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </p>
          <p className="mt-1 text-[9.5px] uppercase tracking-[0.16em] text-faint">
            {listening ? "Mendengar" : "Durasi"}
          </p>
        </div>
      </div>

      <div
        className={`mb-4 flex items-center gap-3 rounded-[3px] border px-4 py-3 transition-colors ${
          listening ? "border-[#5A2B2B] bg-[#1C1416]" : "border-line/60 bg-[#111116]"
        }`}
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            listening ? "animate-[pulse-ring_2.4s_ease-out_infinite] bg-accent/20 text-[#E2A3A3]" : "bg-white/[0.04] text-faint"
          }`}
        >
          <Mic className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-parchment">
            {listening ? "Mikrofon aktif — silakan bicara" : phase === "paused" ? "Dijeda" : phase === "ready" ? "Selesai" : "Siap merekam"}
          </p>
          <p className="mt-0.5 truncate text-[10.5px] text-faint">
            {listening
              ? interim || "Menunggu suara…"
              : "Bahasa Indonesia · pengenalan berjalan di peramban"}
          </p>
        </div>
        {listening && <Circle className="h-2 w-2 animate-pulse fill-[#D98A8A] text-[#D98A8A]" />}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-[3px] border border-[#5A2B2B] bg-[#221618] px-3 py-2.5">
          <TriangleAlert className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[#D98A8A]" />
          <p className="text-[12px] leading-relaxed text-[#E7BFBF]">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {phase === "idle" && (
          <Button variant="primary" onClick={start}>
            <Mic className="h-4 w-4" /> Mulai Bicara
          </Button>
        )}
        {listening && (
          <>
            <Button variant="secondary" onClick={pause}>
              <Pause className="h-4 w-4" /> Jeda
            </Button>
            <Button variant="primary" onClick={finish}>
              <Square className="h-3.5 w-3.5" /> Selesai
            </Button>
          </>
        )}
        {phase === "paused" && (
          <>
            <Button variant="secondary" onClick={start}>
              <Play className="h-4 w-4" /> Lanjutkan
            </Button>
            <Button variant="primary" onClick={finish}>
              <Square className="h-3.5 w-3.5" /> Selesai
            </Button>
          </>
        )}
        {phase === "ready" && (
          <Button variant="ghost" onClick={reset}>
            Mulai Ulang
          </Button>
        )}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="eyebrow">Hasil transkripsi</p>
          <span className="text-[10.5px] text-faint">
            {formatNumber(countWords(finalText))} kata
          </span>
        </div>
        <Textarea
          value={finalText}
          onChange={(e) => setFinalText(e.target.value)}
          rows={8}
          placeholder="Teks akan muncul saat Anda berbicara. Anda juga bisa mengeditnya di sini."
          className="text-[13.5px] leading-[1.8]"
        />
        {interim && (
          <p className="mt-2 text-[12px] italic text-[#8A8073]">
            {interim}
            <span className="ml-1 inline-block h-3 w-[1px] animate-pulse bg-accent align-middle" />
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul catatan (opsional)"
            className="min-w-0 flex-1 rounded-[3px] border border-line bg-[#14141A] px-3 py-2 text-[12.5px] text-parchment placeholder:text-faint focus:border-[#5C4A45] focus:outline-none"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => void saveNote()}
            loading={saving}
            disabled={!finalText.trim()}
          >
            <Save className="h-3.5 w-3.5" /> Simpan Catatan
          </Button>
        </div>
      </div>
    </div>
  );
}
