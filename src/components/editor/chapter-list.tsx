"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, FilePlus2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { Chapter } from "@/lib/types";

export function ChapterList({
  chapters,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onMove,
}: {
  chapters: Chapter[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [menuId, setMenuId] = React.useState<string | null>(null);

  function commit(id: string) {
    const value = draft.trim();
    if (value) onRename(id, value);
    setEditingId(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-2">
        <p className="eyebrow">Bab · {chapters.length}</p>
        <button
          onClick={onAdd}
          aria-label="Tambah bab"
          title="Tambah bab"
          className="flex h-6 w-6 items-center justify-center rounded-[3px] text-faint transition-colors hover:bg-white/[0.06] hover:text-parchment"
        >
          <FilePlus2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <ul className="space-y-[2px]">
        {chapters.map((chapter, index) => {
          const active = chapter.id === activeId;
          return (
            <li key={chapter.id} className="group relative">
              {editingId === chapter.id ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commit(chapter.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commit(chapter.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="w-full rounded-[3px] border border-[#5C4A45] bg-[#14141A] px-2 py-1.5 text-[12px] text-parchment focus:outline-none"
                />
              ) : (
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-[3px] transition-colors",
                    active ? "bg-white/[0.055]" : "hover:bg-white/[0.025]"
                  )}
                >
                  <button
                    onClick={() => onSelect(chapter.id)}
                    className="flex min-w-0 flex-1 items-start gap-2 px-2 py-2 text-left"
                  >
                    <span
                      className={cn(
                        "mt-[1px] shrink-0 font-serif text-[11px] tabular-nums",
                        active ? "text-accent-soft" : "text-[#4E4940]"
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block truncate text-[12px]",
                          active ? "text-parchment" : "text-[#9A9082]"
                        )}
                      >
                        {chapter.title}
                      </span>
                      <span className="mt-0.5 block text-[9.5px] text-faint">
                        {formatNumber(chapter.word_count)} kata
                      </span>
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center pr-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => setMenuId(menuId === chapter.id ? null : chapter.id)}
                      aria-label="Menu bab"
                      className="flex h-5 w-5 items-center justify-center rounded-[2px] text-faint hover:bg-white/[0.08] hover:text-parchment"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {menuId === chapter.id && (
                <div className="absolute right-0 top-9 z-30 w-40 overflow-hidden rounded-[4px] border border-line bg-[#1A1A21] py-1 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.95)]">
                  <button
                    onClick={() => {
                      setEditingId(chapter.id);
                      setDraft(chapter.title);
                      setMenuId(null);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px] text-[#C9BFAF] hover:bg-white/[0.05]"
                  >
                    <Pencil className="h-3 w-3" /> Ganti judul
                  </button>
                  <button
                    disabled={index === 0}
                    onClick={() => {
                      onMove(chapter.id, -1);
                      setMenuId(null);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px] text-[#C9BFAF] hover:bg-white/[0.05] disabled:opacity-30"
                  >
                    <ChevronUp className="h-3 w-3" /> Naikkan
                  </button>
                  <button
                    disabled={index === chapters.length - 1}
                    onClick={() => {
                      onMove(chapter.id, 1);
                      setMenuId(null);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px] text-[#C9BFAF] hover:bg-white/[0.05] disabled:opacity-30"
                  >
                    <ChevronDown className="h-3 w-3" /> Turunkan
                  </button>
                  <div className="my-1 h-px bg-line" />
                  <button
                    disabled={chapters.length <= 1}
                    onClick={() => {
                      onDelete(chapter.id);
                      setMenuId(null);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11.5px] text-[#D98A8A] hover:bg-[#A83232]/10 disabled:opacity-30"
                  >
                    <Trash2 className="h-3 w-3" /> Hapus bab
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <button
        onClick={onAdd}
        className="mt-2 flex items-center gap-1.5 rounded-[3px] border border-dashed border-line px-2 py-2 text-[11px] text-faint transition-colors hover:border-line-strong hover:text-muted"
      >
        <FilePlus2 className="h-3 w-3" /> Bab baru
      </button>
    </div>
  );
}
