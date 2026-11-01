"use client";

import * as React from "react";
import Link from "next/link";
import { Archive, BookOpen, MoreVertical, PencilLine, Star, Trash2 } from "lucide-react";
import type { Story } from "@/lib/types";
import { cn, formatNumber, timeAgo, truncate } from "@/lib/utils";
import { genreLabel, statusLabel } from "@/lib/constants";
import { CoverArt } from "./cover-art";
import { Badge } from "@/components/ui/feedback";

function Menu({
  story,
  onArchive,
  onDelete,
}: {
  story: Story;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Menu cerita"
        className="flex h-7 w-7 items-center justify-center rounded-[3px] text-faint transition-colors hover:bg-white/[0.06] hover:text-parchment"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 w-44 overflow-hidden rounded-[4px] border border-line bg-[#1A1A21] py-1 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95)]">
          <Link
            href={`/studio/${story.id}`}
            className="flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-[#C9BFAF] hover:bg-white/[0.05]"
          >
            <PencilLine className="h-3.5 w-3.5 text-faint" /> Buka Editor
          </Link>
          <Link
            href={`/library/${story.id}`}
            className="flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-[#C9BFAF] hover:bg-white/[0.05]"
          >
            <BookOpen className="h-3.5 w-3.5 text-faint" /> Mode Baca
          </Link>
          <button
            onClick={() => {
              setOpen(false);
              onArchive();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] text-[#C9BFAF] hover:bg-white/[0.05]"
          >
            <Archive className="h-3.5 w-3.5 text-faint" />
            {story.is_archived ? "Keluarkan dari Arsip" : "Arsipkan"}
          </button>
          <div className="my-1 h-px bg-line" />
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] text-[#D98A8A] hover:bg-[#A83232]/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Hapus
          </button>
        </div>
      )}
    </div>
  );
}

export function StoryCard({
  story,
  onFavorite,
  onArchive,
  onDelete,
  className,
}: {
  story: Story;
  onFavorite?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("group relative", className)}>
      <Link href={`/studio/${story.id}`} className="block">
        <div className="relative overflow-hidden rounded-[4px] border border-line transition-all duration-300 group-hover:border-line-strong group-hover:shadow-[0_24px_60px_-40px_rgba(0,0,0,0.9)]">
          <CoverArt
            title={story.title}
            genre={story.genre}
            coverUrl={story.cover_url}
            className="aspect-[2/3] w-full transition-transform duration-700 group-hover:scale-[1.03]"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {story.status !== "completed" && (
            <div className="absolute left-2 top-2">
              <Badge tone={story.status === "draft" ? "muted" : "accent"} className="backdrop-blur">
                {statusLabel(story.status)}
              </Badge>
            </div>
          )}
        </div>
      </Link>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/studio/${story.id}`}>
            <h3 className="truncate font-serif text-[16px] leading-snug text-parchment transition-colors group-hover:text-white">
              {story.title}
            </h3>
          </Link>
          <p className="mt-1 text-[11px] text-faint">
            {genreLabel(story.genre)} · {formatNumber(story.word_count)} kata
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {onFavorite && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onFavorite();
              }}
              aria-label="Favorit"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-[3px] transition-colors hover:bg-white/[0.06]",
                story.is_favorite ? "text-[#C9A227]" : "text-faint hover:text-parchment"
              )}
            >
              <Star className="h-3.5 w-3.5" fill={story.is_favorite ? "currentColor" : "none"} />
            </button>
          )}
          {onArchive && onDelete && (
            <Menu story={story} onArchive={onArchive} onDelete={onDelete} />
          )}
        </div>
      </div>
    </div>
  );
}

export function StoryRow({
  story,
  onFavorite,
  onDelete,
}: {
  story: Story;
  onFavorite?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="group flex items-center gap-4 border-b border-line/60 px-1 py-3.5 transition-colors last:border-b-0 hover:bg-white/[0.015]">
      <Link href={`/studio/${story.id}`} className="shrink-0">
        <CoverArt
          title={story.title}
          genre={story.genre}
          coverUrl={story.cover_url}
          compact
          className="h-[58px] w-[40px] rounded-[2px]"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/studio/${story.id}`}>
          <h3 className="truncate font-serif text-[16px] text-parchment group-hover:text-white">
            {story.title}
          </h3>
        </Link>
        <p className="mt-0.5 truncate text-[12px] text-faint">
          {story.synopsis ? truncate(story.synopsis, 90) : "Belum ada sinopsis."}
        </p>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-[11.5px] text-muted">{formatNumber(story.word_count)} kata</p>
        <p className="mt-0.5 text-[10.5px] text-faint">{timeAgo(story.updated_at)}</p>
      </div>
      <Badge tone="muted" className="hidden md:inline-flex">
        {genreLabel(story.genre)}
      </Badge>
      <div className="flex shrink-0 items-center gap-0.5">
        {onFavorite && (
          <button
            onClick={onFavorite}
            aria-label="Favorit"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-[3px] transition-colors hover:bg-white/[0.06]",
              story.is_favorite ? "text-[#C9A227]" : "text-faint"
            )}
          >
            <Star className="h-3.5 w-3.5" fill={story.is_favorite ? "currentColor" : "none"} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            aria-label="Hapus"
            className="flex h-7 w-7 items-center justify-center rounded-[3px] text-faint transition-colors hover:bg-[#A83232]/10 hover:text-[#D98A8A]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
