"use client";

import * as React from "react";
import {
  Archive,
  Download,
  FileDown,
  FileJson,
  FileText,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Badge, Skeleton } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useData } from "@/components/providers/data-provider";
import { useAsync } from "@/lib/hooks";
import { downloadDocx, storyToHtml, storyToMarkdown, storyToText } from "@/lib/export";
import {
  downloadBlob,
  downloadText,
  formatBytes,
  formatDate,
  formatNumber,
  safeFileName,
} from "@/lib/utils";
import type { BackupPayload, Chapter, MediaSource, Story } from "@/lib/types";

export default function BackupPage() {
  const { repo, profile, mode } = useData();
  const toast = useToast();

  const [storyId, setStoryId] = React.useState("");
  const [chapters, setChapters] = React.useState<Chapter[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = React.useState<BackupPayload | null>(null);

  const restoreRef = React.useRef<HTMLInputElement>(null);

  const { data, loading, reload } = useAsync(
    async () => {
      const [stories, media, notes] = await Promise.all([
        repo.listStories(),
        repo.listMedia(),
        repo.listNotes(),
      ]);
      return { stories, media, notes };
    },
    [repo]
  );

  const stories = data?.stories ?? [];
  const media = data?.media ?? [];

  React.useEffect(() => {
    if (!storyId && stories.length) setStoryId(stories[0].id);
  }, [stories, storyId]);

  React.useEffect(() => {
    if (!storyId) return;
    void repo.listChapters(storyId).then(setChapters);
  }, [repo, storyId]);

  const selectedStory = stories.find((s) => s.id === storyId) ?? null;

  async function exportJson() {
    setBusy("json");
    try {
      const payload = await repo.exportAll();
      downloadText(
        JSON.stringify(payload, null, 2),
        `teror-mistik-backup-${new Date().toISOString().slice(0, 10)}.json`,
        "application/json;charset=utf-8"
      );
      toast.success("Backup JSON diunduh.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat backup.");
    } finally {
      setBusy(null);
    }
  }

  function exportStory(format: "txt" | "md" | "html") {
    if (!selectedStory) return;
    const author = profile?.pen_name || profile?.display_name || "Tanpa Nama";
    const base = safeFileName(selectedStory.title) || "cerita";

    if (format === "txt") {
      downloadText(storyToText(selectedStory, chapters, author), `${base}.txt`);
    } else if (format === "md") {
      downloadText(storyToMarkdown(selectedStory, chapters, author), `${base}.md`, "text/markdown;charset=utf-8");
    } else {
      downloadText(storyToHtml(selectedStory, chapters, author), `${base}.html`, "text/html;charset=utf-8");
    }
    toast.success(`Cerita diekspor sebagai ${format.toUpperCase()}.`);
  }

  async function exportDocxFile() {
    if (!selectedStory) return;
    setBusy("docx");
    try {
      const author = profile?.pen_name || profile?.display_name || "Tanpa Nama";
      await downloadDocx(selectedStory, chapters, author);
      toast.success("DOCX dibuat.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat DOCX.");
    } finally {
      setBusy(null);
    }
  }

  async function downloadMedia(item: MediaSource) {
    setBusy(item.id);
    try {
      const url = await repo.getMediaUrl(item);
      if (!url) {
        toast.error("Berkas tidak tersedia.");
        return;
      }
      const res = await fetch(url);
      const blob = await res.blob();
      downloadBlob(blob, safeFileName(item.file_name) || "media");
    } catch {
      toast.error("Gagal mengunduh media.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRestoreFile(file: File | undefined) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BackupPayload;
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.stories)) {
        toast.error("Berkas bukan backup TEROR MISTIK yang valid.");
        return;
      }
      setPendingRestore(parsed);
    } catch {
      toast.error("Berkas backup tidak dapat dibaca.");
    }
  }

  const counts = {
    stories: data?.stories.length ?? 0,
    media: media.length,
    notes: data?.notes.length ?? 0,
    words: stories.reduce((sum, s) => sum + s.word_count, 0),
  };

  return (
    <>
      <PageHeader
        eyebrow="Archive & Backup"
        title={
          <>
            Tidak ada cerita <span className="italic text-[#C7B9A3]">yang hilang.</span>
          </>
        }
        description="Ekspor naskah dalam berbagai format, unduh media, dan buat salinan penuh arsip Anda."
      />

      {/* Overview */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Cerita", value: counts.stories },
          { label: "Catatan", value: counts.notes },
          { label: "Media", value: counts.media },
          { label: "Kata", value: counts.words },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[4px] border border-line bg-[#15151B] px-4 py-3">
            <p className="font-sans text-[22px] font-light leading-none tracking-tight tabular-nums text-parchment">
              {formatNumber(stat.value)}
            </p>
            <p className="mt-1.5 text-[9.5px] uppercase tracking-[0.16em] text-faint">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Full backup */}
        <section className="rounded-[5px] border border-line bg-[#15151B] p-4 sm:p-5">
          <div className="mb-1 flex items-center gap-2.5">
            <FileJson className="h-4 w-4 text-[#7A7266]" />
            <h2 className="font-serif text-[19px] text-parchment">Backup penuh (JSON)</h2>
          </div>
          <p className="mb-4 text-[11.5px] leading-relaxed text-muted">
            Berisi seluruh metadata, naskah, bab, catatan, versi, dan riwayat AI. Media biner tidak
            disertakan — unduh terpisah di bawah.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => void exportJson()} loading={busy === "json"}>
              <Download className="h-4 w-4" /> Unduh Backup
            </Button>
            <Button variant="secondary" onClick={() => restoreRef.current?.click()}>
              <Upload className="h-4 w-4" /> Restore
            </Button>
            <input
              ref={restoreRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => void handleRestoreFile(e.target.files?.[0])}
            />
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-[3px] border border-line bg-[#111116] px-3 py-2.5">
            <ShieldCheck className="mt-[1px] h-3.5 w-3.5 shrink-0 text-[#6FA37F]" />
            <p className="text-[10.5px] leading-relaxed text-faint">
              Simpan berkas backup di tempat aman. Berkas ini memuat seluruh isi arsip Anda dalam
              teks biasa.
            </p>
          </div>
        </section>

        {/* Story export */}
        <section className="rounded-[5px] border border-line bg-[#15151B] p-4 sm:p-5">
          <div className="mb-1 flex items-center gap-2.5">
            <FileDown className="h-4 w-4 text-[#7A7266]" />
            <h2 className="font-serif text-[19px] text-parchment">Ekspor cerita</h2>
          </div>
          <p className="mb-4 text-[11.5px] leading-relaxed text-muted">
            Pilih satu cerita, lalu ekspor ke format yang Anda butuhkan.
          </p>

          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={storyId} onChange={(e) => setStoryId(e.target.value)}>
              {stories.length === 0 && <option value="">Belum ada cerita</option>}
              {stories.map((story: Story) => (
                <option key={story.id} value={story.id}>
                  {story.title} ({formatNumber(story.word_count)} kata)
                </option>
              ))}
            </Select>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button variant="secondary" size="sm" disabled={!selectedStory} onClick={() => exportStory("txt")}>
              <FileText className="h-3.5 w-3.5" /> TXT
            </Button>
            <Button variant="secondary" size="sm" disabled={!selectedStory} onClick={() => exportStory("md")}>
              <FileText className="h-3.5 w-3.5" /> Markdown
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!selectedStory}
              onClick={() => void exportDocxFile()}
              loading={busy === "docx"}
            >
              <FileDown className="h-3.5 w-3.5" /> DOCX
            </Button>
            <Button variant="secondary" size="sm" disabled={!selectedStory} onClick={() => exportStory("html")}>
              <FileText className="h-3.5 w-3.5" /> HTML
            </Button>
          </div>

          {selectedStory && (
            <p className="mt-3 text-[10.5px] text-faint">
              {chapters.length} bab · {formatNumber(selectedStory.word_count)} kata · diperbarui{" "}
              {formatDate(selectedStory.updated_at)}
            </p>
          )}
        </section>

        {/* Media */}
        <section className="rounded-[5px] border border-line bg-[#15151B] p-4 sm:p-5 lg:col-span-2">
          <div className="mb-1 flex items-center gap-2.5">
            <Archive className="h-4 w-4 text-[#7A7266]" />
            <h2 className="font-serif text-[19px] text-parchment">Berkas media</h2>
            <Badge tone="muted" className="ml-auto">
              {media.length} berkas
            </Badge>
          </div>
          <p className="mb-4 text-[11.5px] leading-relaxed text-muted">
            Unduh rekaman dan video asli yang tersimpan di arsip.
          </p>

          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : media.length === 0 ? (
            <p className="py-4 text-[12px] text-faint">Belum ada media tersimpan.</p>
          ) : (
            <div className="divide-y divide-line/60">
              {media.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-[#C9BFAF]">{item.file_name}</p>
                    <p className="mt-0.5 text-[10px] text-faint">
                      {formatBytes(item.size_bytes)} · {formatDate(item.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void downloadMedia(item)}
                    loading={busy === item.id}
                  >
                    <Download className="h-3.5 w-3.5" /> Unduh
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(pendingRestore)}
        onClose={() => setPendingRestore(null)}
        title="Pulihkan dari backup?"
        message={`Backup tanggal ${pendingRestore ? formatDate(pendingRestore.exported_at) : ""} berisi ${pendingRestore?.stories.length ?? 0} cerita dan ${pendingRestore?.notes.length ?? 0} catatan. Data yang ada akan digabungkan (ID yang sama akan ditimpa).`}
        confirmLabel="Pulihkan"
        danger={false}
        onConfirm={async () => {
          if (!pendingRestore) return;
          await repo.importAll(pendingRestore);
          toast.success("Backup dipulihkan.");
          reload();
          if (restoreRef.current) restoreRef.current.value = "";
        }}
      />

      <p className="mt-8 text-center text-[10.5px] text-faint">
        Mode data: {mode === "supabase" ? "Supabase" : "Lokal"} ·{" "}
        {mode === "local"
          ? "backup adalah satu-satunya salinan di luar perangkat ini."
          : "backup melengkapi replikasi Supabase."}
      </p>
    </>
  );
}
