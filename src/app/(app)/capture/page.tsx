"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  AudioLines,
  FileText,
  Mic,
  NotebookPen,
  PenLine,
  Sparkles,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useData } from "@/components/providers/data-provider";
import { useAsync } from "@/lib/hooks";
import { ManualCapture } from "@/components/capture/manual-capture";
import { VoiceRecorder } from "@/components/capture/voice-recorder";
import { SpeechCapture } from "@/components/capture/speech-capture";
import { convertNoteToStory } from "@/lib/note-actions";
import { NOTE_METHODS } from "@/lib/constants";
import { truncate, timeAgo, countWords, formatNumber } from "@/lib/utils";
import type { Note } from "@/lib/types";

const TABS = [
  { id: "manual", label: "Catatan Manual", icon: FileText },
  { id: "voice", label: "Rekaman Suara", icon: Mic },
  { id: "speech", label: "Voice-to-Text", icon: AudioLines },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function CapturePage() {
  const { repo } = useData();
  const router = useRouter();
  const toast = useToast();

  const [tab, setTab] = React.useState<TabId>("manual");
  const [confirmDelete, setConfirmDelete] = React.useState<Note | null>(null);
  const [converting, setConverting] = React.useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    if (mode === "voice" || mode === "speech" || mode === "manual") setTab(mode);
  }, []);

  const { data: notes, loading, reload } = useAsync(() => repo.listNotes(), [repo]);

  const recent = (notes ?? []).slice(0, 12);
  const totalRaw = (notes ?? []).filter((n) => n.status === "raw").length;

  async function openInStudio(note: Note) {
    setConverting(note.id);
    try {
      const story = await convertNoteToStory(repo, note);
      toast.success("Catatan diubah menjadi cerita.");
      router.push(`/studio/${story.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah catatan.");
    } finally {
      setConverting(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Quick Capture"
        title={
          <>
            Tangkap sebelum <span className="italic text-[#C7B9A3]">hilang.</span>
          </>
        }
        description="Tiga cara menangkap cerita: menulis, merekam suara, atau berbicara langsung. Semua tersimpan sebagai catatan mentah yang tidak pernah ditimpa AI."
        actions={
          <Badge tone="muted">
            {formatNumber(totalRaw)} catatan mentah
          </Badge>
        }
      />

      <div className="mb-6 flex gap-0.5 border-b border-line">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`relative flex flex-1 items-center justify-center gap-1.5 px-1 py-3 text-[11.5px] transition-colors sm:flex-none sm:px-4 sm:text-[12.5px] ${
                active ? "text-parchment" : "text-faint hover:text-muted"
              }`}
            >
              <item.icon className="hidden h-[15px] w-[15px] sm:block" strokeWidth={1.6} />
              {item.label}
              {active && <span className="absolute inset-x-2 -bottom-px h-[1.5px] bg-accent" />}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {tab === "manual" && <ManualCapture onSaved={() => reload()} />}
          {tab === "voice" && <VoiceRecorder onSaved={() => reload()} />}
          {tab === "speech" && (
            <SpeechCapture onSaved={() => reload()} onFallback={() => setTab("voice")} />
          )}

          <div className="mt-4 rounded-[4px] border border-line/60 bg-white/[0.012] px-4 py-3">
            <p className="text-[11.5px] leading-relaxed text-faint">
              <span className="text-[#C9A98A]">Catatan asli tidak akan pernah dihapus.</span>{" "}
              Pemrosesan AI di Writing Studio selalu menghasilkan versi baru — naskah mentah tetap
              utuh sebagai sumber cerita.
            </p>
          </div>
        </div>

        <aside className="lg:col-span-1">
          <div className="rounded-[5px] border border-line bg-[#15151B]">
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <p className="eyebrow">Catatan terbaru</p>
              <NotebookPen className="h-3.5 w-3.5 text-[#3E3A44]" />
            </div>

            {loading ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={<NotebookPen className="h-4 w-4" />}
                  title="Belum ada catatan"
                  description="Catatan pertama Anda akan muncul di sini."
                  className="border-0 px-0 py-6"
                />
              </div>
            ) : (
              <ul className="max-h-[560px] divide-y divide-line/60 overflow-y-auto">
                {recent.map((note) => (
                  <li key={note.id} className="group px-4 py-3.5">
                    <div className="mb-1.5 flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-parchment">
                        {note.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-faint">{timeAgo(note.updated_at)}</span>
                    </div>
                    <p className="line-clamp-2 text-[11.5px] leading-relaxed text-[#8A8073]">
                      {truncate(note.body, 110)}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge tone="muted">{NOTE_METHODS[note.method]}</Badge>
                        <span className="text-[10px] text-faint">
                          {formatNumber(countWords(note.body))} kata
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => void openInStudio(note)}
                          disabled={converting === note.id}
                          aria-label="Buka di studio"
                          title="Buka di Studio"
                          className="flex h-6 w-6 items-center justify-center rounded-[3px] text-faint hover:bg-white/[0.06] hover:text-parchment disabled:opacity-40"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(note)}
                          aria-label="Hapus catatan"
                          title="Hapus"
                          className="flex h-6 w-6 items-center justify-center rounded-[3px] text-faint hover:bg-[#A83232]/10 hover:text-[#D98A8A]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 rounded-[5px] border border-line bg-gradient-to-b from-[#1A1518] to-[#15151B] p-4">
            <p className="eyebrow mb-2">Alur kerja</p>
            <ol className="space-y-2.5 text-[11.5px] leading-relaxed text-[#9A9082]">
              <li className="flex gap-2.5">
                <span className="text-accent">01</span> Tangkap cerita lisan lewat rekaman atau
                voice-to-text.
              </li>
              <li className="flex gap-2.5">
                <span className="text-accent">02</span> Buka catatan di Writing Studio, pilih mode
                Natural atau Professional.
              </li>
              <li className="flex gap-2.5">
                <span className="text-accent">03</span> Bandingkan hasil AI dengan naskah asli,
                terima atau tolak.
              </li>
              <li className="flex gap-2.5">
                <span className="text-accent">04</span> Simpan sebagai cerita di My Library.
              </li>
            </ol>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 px-0 text-[11.5px]"
              onClick={() => router.push("/studio")}
            >
              Buka Writing Studio <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Hapus catatan?"
        message={`Catatan "${confirmDelete?.title ?? ""}" akan dihapus permanen. Cerita yang sudah dibuat dari catatan ini tidak terpengaruh.`}
        onConfirm={async () => {
          if (!confirmDelete) return;
          await repo.deleteNote(confirmDelete.id);
          toast.success("Catatan dihapus.");
          reload();
        }}
      />
    </>
  );
}
