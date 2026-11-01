"use client";

import * as React from "react";
import {
  AudioLines,
  Download,
  FileAudio,
  Film,
  Trash2,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useData } from "@/components/providers/data-provider";
import { useAsync } from "@/lib/hooks";
import { AudioPanel } from "@/components/transcription/audio-panel";
import { VideoPanel } from "@/components/transcription/video-panel";
import { formatBytes, formatDateShort, formatDuration, timeAgo, truncate, downloadBlob, safeFileName } from "@/lib/utils";
import type { MediaSource } from "@/lib/types";

const TABS = [
  { id: "audio", label: "Audio → Teks", icon: AudioLines },
  { id: "video", label: "Video → Teks", icon: Video },
] as const;

export default function TranscriptionPage() {
  const { repo } = useData();
  const toast = useToast();
  const [tab, setTab] = React.useState<"audio" | "video">("audio");
  const [detail, setDetail] = React.useState<MediaSource | null>(null);
  const [toDelete, setToDelete] = React.useState<MediaSource | null>(null);
  const [downloading, setDownloading] = React.useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t === "video" || t === "audio") setTab(t);
  }, []);

  const { data: media, loading, reload } = useAsync(() => repo.listMedia(), [repo]);

  async function download(item: MediaSource) {
    setDownloading(item.id);
    try {
      const url = await repo.getMediaUrl(item);
      if (!url) {
        toast.error("Berkas media tidak tersedia untuk diunduh.");
        return;
      }
      const res = await fetch(url);
      const blob = await res.blob();
      downloadBlob(blob, safeFileName(item.file_name) || "media");
    } catch {
      toast.error("Gagal mengunduh media.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Transcription Center"
        title={
          <>
            Dari suara, <span className="italic text-[#C7B9A3]">menjadi naskah.</span>
          </>
        }
        description="Unggah rekaman atau video, lalu ubah menjadi tulisan yang bisa diedit. Transkrip dapat langsung dikirim ke Writing Studio sebagai bahan cerita."
      />

      <div className="mb-6 flex gap-1 border-b border-line">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-[12.5px] transition-colors ${
                active ? "text-parchment" : "text-faint hover:text-muted"
              }`}
            >
              <item.icon className="h-[15px] w-[15px]" strokeWidth={1.6} />
              {item.label}
              {active && <span className="absolute inset-x-2 -bottom-px h-[1.5px] bg-accent" />}
            </button>
          );
        })}
      </div>

      {tab === "audio" ? <AudioPanel onSaved={reload} /> : <VideoPanel onSaved={reload} />}

      {/* Media archive */}
      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="eyebrow mb-2">Arsip media</p>
            <h2 className="font-serif text-[22px] text-parchment">Rekaman &amp; video tersimpan</h2>
          </div>
          <span className="text-[11px] text-faint">{media?.length ?? 0} berkas</span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !media || media.length === 0 ? (
          <EmptyState
            icon={<FileAudio className="h-5 w-5" />}
            title="Belum ada media"
            description="Transkrip dan rekaman yang Anda proses akan tersimpan di sini."
          />
        ) : (
          <div className="divide-y divide-line/60 rounded-[5px] border border-line bg-[#15151B]">
            {media.map((item) => (
              <div key={item.id} className="group flex items-center gap-3 px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border border-line bg-white/[0.02] text-[#7A7266]">
                  {item.kind === "audio" ? <FileAudio className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />}
                </span>
                <button onClick={() => setDetail(item)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-[12.5px] text-parchment">{item.file_name}</p>
                  <p className="mt-0.5 truncate text-[10.5px] text-faint">
                    {truncate(item.transcript || item.summary || "Belum ada transkrip", 90)}
                  </p>
                </button>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-[10.5px] text-muted">
                    {formatDuration(item.duration_seconds)} · {formatBytes(item.size_bytes)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-faint">{formatDateShort(item.created_at)}</p>
                </div>
                <Badge
                  tone={
                    item.transcript_status === "done"
                      ? "success"
                      : item.transcript_status === "error"
                        ? "accent"
                        : "muted"
                  }
                >
                  {item.transcript_status}
                </Badge>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => void download(item)}
                    disabled={downloading === item.id}
                    aria-label="Unduh"
                    className="flex h-7 w-7 items-center justify-center rounded-[3px] text-faint hover:bg-white/[0.06] hover:text-parchment disabled:opacity-40"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setToDelete(item)}
                    aria-label="Hapus"
                    className="flex h-7 w-7 items-center justify-center rounded-[3px] text-faint hover:bg-[#A83232]/10 hover:text-[#D98A8A]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.file_name ?? "Media"}
        description={`${detail?.kind === "audio" ? "Audio" : "Video"} · ${formatBytes(detail?.size_bytes ?? 0)} · ${timeAgo(detail?.created_at)}`}
        size="lg"
        footer={
          <button
            onClick={() => setDetail(null)}
            className="h-9 rounded-[4px] border border-line px-3.5 text-[13px] text-muted hover:text-parchment"
          >
            Tutup
          </button>
        }
      >
        <div className="space-y-4">
          {detail?.summary && (
            <div>
              <p className="eyebrow mb-2">Ringkasan</p>
              <p className="text-[13px] leading-relaxed text-[#C9BFAF]">{detail.summary}</p>
            </div>
          )}
          {detail?.key_points && detail.key_points.length > 0 && (
            <div>
              <p className="eyebrow mb-2">Poin penting</p>
              <ul className="space-y-1.5">
                {detail.key_points.map((point, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] text-[#B9AE9D]">
                    <span className="text-accent">·</span> {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="eyebrow mb-2">Transkrip</p>
            <div className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap rounded-[4px] border border-line bg-[#111116] p-3.5 text-[12.5px] leading-[1.85] text-[#C9BFAF]">
              {detail?.transcript || "Belum ada transkrip untuk media ini."}
            </div>
          </div>
          {detail?.source_url && (
            <p className="text-[10.5px] text-faint">
              Sumber: <span className="text-muted">{detail.source_url}</span>
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Hapus media?"
        message={`"${toDelete?.file_name ?? ""}" beserta transkripnya akan dihapus. Catatan yang sudah dibuat tetap tersimpan.`}
        onConfirm={async () => {
          if (!toDelete) return;
          await repo.deleteMedia(toDelete.id);
          toast.success("Media dihapus.");
          reload();
        }}
      />
    </>
  );
}
