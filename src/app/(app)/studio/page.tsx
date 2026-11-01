"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, NotebookPen, PenLine, Plus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { useData } from "@/components/providers/data-provider";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { StoryCard } from "@/components/story/story-card";
import { NewStoryDialog } from "@/components/story/new-story-dialog";
import { convertNoteToStory } from "@/lib/note-actions";
import { NOTE_METHODS, STATUSES } from "@/lib/constants";
import { formatNumber, timeAgo, truncate } from "@/lib/utils";
import type { Note, StoryStatus } from "@/lib/types";

const FILTERS: { id: "all" | StoryStatus; label: string }[] = [
  { id: "all", label: "Semua" },
  ...STATUSES.map((s) => ({ id: s.value, label: s.label })),
];

export default function StudioPage() {
  const { repo } = useData();
  const router = useRouter();
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<"all" | StoryStatus>("all");
  const [busyNote, setBusyNote] = React.useState<string | null>(null);

  const { data, loading, reload } = useAsync(
    async () => {
      const [stories, notes] = await Promise.all([repo.listStories(), repo.listNotes()]);
      return { stories, notes };
    },
    [repo]
  );

  const stories = (data?.stories ?? []).filter((s) => !s.is_archived);
  const rawNotes = (data?.notes ?? []).filter((n) => n.status === "raw").slice(0, 4);
  const filtered = filter === "all" ? stories : stories.filter((s) => s.status === filter);

  async function processNote(note: Note) {
    setBusyNote(note.id);
    try {
      const story = await convertNoteToStory(repo, note);
      toast.success("Catatan dibuka di studio.");
      router.push(`/studio/${story.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuka catatan.");
    } finally {
      setBusyNote(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AI Writing Studio"
        title={
          <>
            Tempat naskah <span className="italic text-[#C7B9A3]">ditempa.</span>
          </>
        }
        description="Editor profesional dengan dua mode pengolahan AI. Naskah asli tidak pernah ditimpa — setiap perubahan adalah versi baru yang bisa dibandingkan."
        actions={
          <Button variant="primary" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Cerita Baru
          </Button>
        }
      />

      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line no-scrollbar">
        {FILTERS.map((item) => {
          const active = filter === item.id;
          const count =
            item.id === "all" ? stories.length : stories.filter((s) => s.status === item.id).length;
          return (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`relative shrink-0 px-3.5 py-2.5 text-[12px] transition-colors ${
                active ? "text-parchment" : "text-faint hover:text-muted"
              }`}
            >
              {item.label}
              <span className="ml-1.5 text-[10px] text-[#4E4940]">{count}</span>
              {active && <span className="absolute inset-x-2 -bottom-px h-[1.5px] bg-accent" />}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="aspect-[2/3] w-full" />
              <Skeleton className="mt-3 h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<PenLine className="h-5 w-5" />}
          title={filter === "all" ? "Studio masih sunyi" : "Tidak ada cerita di tahap ini"}
          description={
            filter === "all"
              ? "Mulai naskah baru, atau olah catatan mentah dari Quick Capture menjadi cerita."
              : "Ubah status cerita dari halaman editor untuk melihatnya di sini."
          }
          action={
            <Button variant="primary" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Mulai Menulis
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onFavorite={async () => {
                await repo.updateStory(story.id, { is_favorite: !story.is_favorite });
                reload();
              }}
              onArchive={async () => {
                await repo.updateStory(story.id, { is_archived: !story.is_archived });
                toast.success(story.is_archived ? "Cerita dikeluarkan dari arsip." : "Cerita diarsipkan.");
                reload();
              }}
              onDelete={async () => {
                await repo.deleteStory(story.id);
                toast.success("Cerita dihapus.");
                reload();
              }}
            />
          ))}
        </div>
      )}

      {rawNotes.length > 0 && (
        <section className="mt-14 border-t border-line pt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Siap diolah</p>
              <h2 className="font-serif text-[22px] text-parchment">Catatan mentah terbaru</h2>
            </div>
            <Link
              href="/capture"
              className="text-[11px] uppercase tracking-[0.14em] text-faint hover:text-parchment"
            >
              Semua catatan →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {rawNotes.map((note) => (
              <div
                key={note.id}
                className="group rounded-[4px] border border-line bg-[#15151B] p-4 transition-colors hover:border-line-strong"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-parchment">
                    {note.title}
                  </p>
                  <Badge tone="muted">{NOTE_METHODS[note.method]}</Badge>
                </div>
                <p className="line-clamp-2 text-[11.5px] leading-relaxed text-[#8A8073]">
                  {truncate(note.body, 150)}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-faint">
                    {formatNumber(note.body.split(/\s+/).length)} kata · {timeAgo(note.updated_at)}
                  </span>
                  <button
                    onClick={() => void processNote(note)}
                    disabled={busyNote === note.id}
                    className="flex items-center gap-1.5 text-[11px] text-[#C9A98A] transition-colors hover:text-parchment disabled:opacity-50"
                  >
                    <Sparkles className="h-3 w-3" />
                    {busyNote === note.id ? "Membuka…" : "Olah di Studio"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-line bg-white/[0.012] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <NotebookPen className="h-4 w-4 text-[#5F584C]" />
          <p className="text-[11.5px] text-muted">
            Ingin mulai dari rekaman? Unggah audio atau video dan biarkan sistem menuliskannya.
          </p>
        </div>
        <Link href="/transcription">
          <Button variant="ghost" size="sm">
            Transcription Center <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      <NewStoryDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
