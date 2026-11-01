"use client";

import * as React from "react";
import {
  Archive,
  Grid2X2,
  Library as LibraryIcon,
  List,
  Plus,
  Search,
  Star,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Badge, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useData } from "@/components/providers/data-provider";
import { useAsync } from "@/lib/hooks";
import { StoryCard, StoryRow } from "@/components/story/story-card";
import { NewStoryDialog } from "@/components/story/new-story-dialog";
import { GENRES, STATUSES } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import type { Story } from "@/lib/types";

type Scope = "all" | "favorite" | "archived";

export default function LibraryPage() {
  const { repo } = useData();
  const toast = useToast();

  const [query, setQuery] = React.useState("");
  const [genre, setGenre] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [scope, setScope] = React.useState<Scope>("all");
  const [sort, setSort] = React.useState("updated");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<Story | null>(null);

  const { data, loading, reload } = useAsync(() => repo.listStories(), [repo]);

  const stories = data ?? [];

  const filtered = React.useMemo(() => {
    let list = [...stories];

    if (scope === "favorite") list = list.filter((s) => s.is_favorite && !s.is_archived);
    else if (scope === "archived") list = list.filter((s) => s.is_archived);
    else list = list.filter((s) => !s.is_archived);

    if (genre !== "all") list = list.filter((s) => s.genre === genre);
    if (status !== "all") list = list.filter((s) => s.status === status);

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.synopsis.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "id");
      if (sort === "words") return b.word_count - a.word_count;
      if (sort === "created") return b.created_at.localeCompare(a.created_at);
      return b.updated_at.localeCompare(a.updated_at);
    });

    return list;
  }, [stories, scope, genre, status, query, sort]);

  const totalWords = stories.reduce((sum, s) => sum + s.word_count, 0);
  const hasFilter = query || genre !== "all" || status !== "all" || scope !== "all";

  return (
    <>
      <PageHeader
        eyebrow="My Library"
        title={
          <>
            Perpustakaan <span className="italic text-[#C7B9A3]">pribadi.</span>
          </>
        }
        description="Seluruh cerita Anda — selesai, setengah jadi, atau hanya berupa fragmen. Tidak ada yang bisa mengaksesnya selain Anda."
        actions={
          <>
            <Badge tone="muted" className="hidden sm:inline-flex">
              {formatNumber(totalWords)} kata terarsip
            </Badge>
            <Button variant="primary" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Cerita Baru
            </Button>
          </>
        }
      />

      {/* Toolbar */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul, sinopsis, atau tag…"
              className="pl-9"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Bersihkan pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-faint hover:text-parchment"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <Select value={genre} onChange={(e) => setGenre(e.target.value)} className="min-w-0 flex-1 sm:w-[168px]">
              <option value="all">Semua kategori</option>
              {GENRES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </Select>

            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="min-w-0 flex-1 sm:w-[150px]">
              <option value="all">Semua status</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>

            <Select value={sort} onChange={(e) => setSort(e.target.value)} className="min-w-0 flex-1 sm:w-[140px]">
              <option value="updated">Terbaru</option>
              <option value="created">Terlama dibuat</option>
              <option value="title">Judul A–Z</option>
              <option value="words">Paling panjang</option>
            </Select>

            <div className="flex shrink-0 items-center rounded-[4px] border border-line bg-[#14141A] p-0.5">
              <button
                onClick={() => setView("grid")}
                aria-label="Tampilan grid"
                className={`flex h-8 w-8 items-center justify-center rounded-[3px] transition-colors ${view === "grid" ? "bg-white/[0.06] text-parchment" : "text-faint"}`}
              >
                <Grid2X2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setView("list")}
                aria-label="Tampilan daftar"
                className={`flex h-8 w-8 items-center justify-center rounded-[3px] transition-colors ${view === "list" ? "bg-white/[0.06] text-parchment" : "text-faint"}`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {(
              [
                { id: "all", label: "Semua", icon: LibraryIcon },
                { id: "favorite", label: "Favorit", icon: Star },
                { id: "archived", label: "Arsip", icon: Archive },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setScope(item.id)}
                className={`flex items-center gap-1.5 rounded-[3px] px-2.5 py-1.5 text-[11.5px] transition-colors ${
                  scope === item.id
                    ? "bg-white/[0.055] text-parchment"
                    : "text-faint hover:text-muted"
                }`}
              >
                <item.icon className="h-3 w-3" /> {item.label}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-faint">
            {formatNumber(filtered.length)} cerita
            {hasFilter && (
              <button
                onClick={() => {
                  setQuery("");
                  setGenre("all");
                  setStatus("all");
                  setScope("all");
                }}
                className="ml-2 text-[#C9A98A] hover:text-parchment"
              >
                Reset filter
              </button>
            )}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i}>
              <Skeleton className="aspect-[2/3] w-full" />
              <Skeleton className="mt-3 h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<LibraryIcon className="h-5 w-5" />}
          title={hasFilter ? "Tidak ada yang cocok" : "Perpustakaan masih kosong"}
          description={
            hasFilter
              ? "Coba kata kunci lain, atau longgarkan filter yang aktif."
              : "Cerita pertama Anda akan tersimpan di sini — lengkap dengan cover, bab, dan versi naskah."
          }
          action={
            hasFilter ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setGenre("all");
                  setStatus("all");
                  setScope("all");
                }}
              >
                Reset filter
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" /> Tambah Cerita
              </Button>
            )
          }
        />
      ) : view === "grid" ? (
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
                toast.success(story.is_archived ? "Dikeluarkan dari arsip." : "Dipindahkan ke arsip.");
                reload();
              }}
              onDelete={() => setToDelete(story)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[5px] border border-line bg-[#15151B] px-4">
          {filtered.map((story) => (
            <StoryRow
              key={story.id}
              story={story}
              onFavorite={async () => {
                await repo.updateStory(story.id, { is_favorite: !story.is_favorite });
                reload();
              }}
              onDelete={() => setToDelete(story)}
            />
          ))}
        </div>
      )}

      <NewStoryDialog open={dialogOpen} onClose={() => setDialogOpen(false)} redirect />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Hapus cerita?"
        message={`"${toDelete?.title ?? ""}" beserta seluruh bab dan versinya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={async () => {
          if (!toDelete) return;
          await repo.deleteStory(toDelete.id);
          toast.success("Cerita dihapus.");
          reload();
        }}
      />
    </>
  );
}
