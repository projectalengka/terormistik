"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Settings2,
  Type,
  X,
} from "lucide-react";
import { useData } from "@/components/providers/data-provider";
import { useAsync } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { cn, countWords, formatNumber, parseDoc, readingTime, tiptapToHtml } from "@/lib/utils";
import { genreLabel } from "@/lib/constants";
import type { Chapter, Story } from "@/lib/types";

interface Prefs {
  fontSize: number;
  lineHeight: number;
  theme: "dark" | "sepia";
}

const DEFAULT_PREFS: Prefs = { fontSize: 18, lineHeight: 1.95, theme: "dark" };
const PREFS_KEY = "tm.reader.prefs";

export default function ReadingPage() {
  const params = useParams<{ id: string }>();
  const storyId = params.id;
  const { repo } = useData();

  const { data, loading } = useAsync(async () => {
    const story = await repo.getStory(storyId);
    if (!story) return null;
    const [chapters, progress] = await Promise.all([
      repo.listChapters(storyId),
      repo.getProgress(storyId),
    ]);
    return { story, chapters, progress };
  }, [repo, storyId]);

  const [chapterIndex, setChapterIndex] = React.useState(0);
  const [prefs, setPrefs] = React.useState<Prefs>(DEFAULT_PREFS);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showChapters, setShowChapters] = React.useState(false);
  const [focusMode, setFocusMode] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [resumeAt, setResumeAt] = React.useState<number | null>(null);

  const articleRef = React.useRef<HTMLDivElement>(null);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) });
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const story = data?.story ?? null;
  const chapters = data?.chapters ?? [];
  const chapter = chapters[chapterIndex] ?? null;

  React.useEffect(() => {
    const saved = data?.progress;
    if (!saved) return;
    if (saved.percent > 5 && saved.percent < 98) {
      setResumeAt(saved.percent);
      const idx = chapters.findIndex((c) => c.id === saved.chapter_id);
      if (idx >= 0) setChapterIndex(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const storyWords = story?.word_count ?? 0;

  // Scroll progress + persistence
  React.useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.4;
      const scrolled = Math.max(0, -rect.top + window.innerHeight * 0.2);
      const percent = total > 0 ? Math.min(100, Math.round((scrolled / total) * 100)) : 100;
      setProgress(percent);

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void repo.saveProgress(storyId, chapter?.id ?? null, percent).catch(() => undefined);
      }, 1500);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [repo, storyId, chapter?.id]);

  function goChapter(next: number) {
    if (next < 0 || next >= chapters.length) return;
    setChapterIndex(next);
    setShowChapters(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch {
      /* not supported */
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[680px] space-y-4 py-10">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-8 h-[60vh] w-full" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <p className="font-serif text-2xl text-parchment">Cerita tidak ditemukan</p>
        <Link href="/library" className="mt-5">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Perpustakaan
          </Button>
        </Link>
      </div>
    );
  }

  const chapterWords = chapter ? countWords(extractText(chapter.content)) : 0;

  const isSepia = prefs.theme === "sepia";

  return (
    <div
      className={cn("relative -mx-4 -mt-6 sm:-mx-6 lg:-mx-10 lg:-mt-10")}
      style={{ backgroundColor: isSepia ? "#1C1915" : undefined }}
    >
      {/* Reading progress */}
      <div className="fixed inset-x-0 top-0 z-50 h-[2px] bg-transparent">
        <div
          className="h-full bg-accent transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Top bar */}
      <div
        className={cn(
          "sticky top-0 z-40 border-b border-line/70 bg-base/85 backdrop-blur-md transition-opacity duration-300",
          focusMode && "opacity-25 hover:opacity-100"
        )}
        style={{ backgroundColor: isSepia ? "rgba(28,25,21,0.9)" : undefined }}
      >
        <div className="mx-auto flex h-14 max-w-[860px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/library"
            className="flex items-center gap-2 text-[11.5px] text-faint transition-colors hover:text-parchment"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Perpustakaan</span>
          </Link>

          <p className="min-w-0 flex-1 truncate text-center font-serif text-[14px] text-[#C9BFAF]">
            {story.title}
          </p>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowChapters((v) => !v)}
              aria-label="Daftar bab"
              title="Daftar bab"
              className="flex h-8 w-8 items-center justify-center rounded-[3px] text-faint transition-colors hover:bg-white/[0.05] hover:text-parchment"
            >
              <Type className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setShowSettings((v) => !v)}
              aria-label="Pengaturan baca"
              title="Pengaturan"
              className="flex h-8 w-8 items-center justify-center rounded-[3px] text-faint transition-colors hover:bg-white/[0.05] hover:text-parchment"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => void toggleFullscreen()}
              aria-label="Layar penuh"
              title="Layar penuh"
              className="flex h-8 w-8 items-center justify-center rounded-[3px] text-faint transition-colors hover:bg-white/[0.05] hover:text-parchment"
            >
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setFocusMode((v) => !v)}
              aria-label="Mode fokus"
              title="Mode fokus"
              className={cn(
                "ml-1 rounded-[3px] border px-2 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors",
                focusMode
                  ? "border-[#5A2B2B] bg-accent/10 text-[#E2A3A3]"
                  : "border-line text-faint hover:text-parchment"
              )}
            >
              Fokus
            </button>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="border-t border-line bg-[#131318] px-4 py-4 sm:px-6">
            <div className="mx-auto grid max-w-[860px] gap-4 sm:grid-cols-3">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-muted">Ukuran teks</span>
                  <span className="text-[10px] text-faint">{prefs.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={26}
                  step={1}
                  value={prefs.fontSize}
                  onChange={(e) => setPrefs((p) => ({ ...p, fontSize: Number(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-muted">Jarak baris</span>
                  <span className="text-[10px] text-faint">{prefs.lineHeight.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={1.4}
                  max={2.4}
                  step={0.05}
                  value={prefs.lineHeight}
                  onChange={(e) => setPrefs((p) => ({ ...p, lineHeight: Number(e.target.value) }))}
                  className="w-full"
                />
              </div>
              <div>
                <span className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-muted">
                  Tema
                </span>
                <div className="flex gap-1 rounded-[4px] border border-line bg-[#111116] p-0.5">
                  {(
                    [
                      { id: "dark", label: "Gelap" },
                      { id: "sepia", label: "Sepia" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setPrefs((p) => ({ ...p, theme: t.id }))}
                      className={cn(
                        "flex-1 rounded-[3px] px-2 py-1.5 text-[11px] transition-colors",
                        prefs.theme === t.id
                          ? "bg-white/[0.07] text-parchment"
                          : "text-faint hover:text-muted"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chapter drawer */}
        {showChapters && (
          <div className="border-t border-line bg-[#131318] px-4 py-3 sm:px-6">
            <div className="mx-auto max-w-[860px]">
              <p className="eyebrow mb-2">Daftar bab</p>
              <ul className="max-h-[40vh] overflow-y-auto">
                {chapters.map((c, i) => (
                  <li key={c.id}>
                    <button
                      onClick={() => goChapter(i)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-[3px] px-2 py-2 text-left text-[12.5px] transition-colors",
                        i === chapterIndex
                          ? "bg-white/[0.05] text-parchment"
                          : "text-[#9A9082] hover:bg-white/[0.025]"
                      )}
                    >
                      <span className="truncate">
                        <span className="mr-2 font-serif text-[11px] text-faint">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {c.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-faint">
                        {formatNumber(c.word_count)} kata
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Article */}
      <div className="mx-auto max-w-[680px] px-5 pb-24 pt-12 sm:px-6 sm:pt-16">
        <header className="mb-10 text-center">
          <p className="eyebrow mb-3">{genreLabel(story.genre)}</p>
          <h1 className="font-serif text-[32px] leading-[1.1] text-parchment sm:text-[42px]">
            {story.title}
          </h1>
          <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-faint">
            {formatNumber(storyWords)} kata · {readingTime(storyWords)}
          </p>
          <div className="mx-auto mt-6 h-px w-14 bg-accent/50" />
        </header>

        {resumeAt && progress < 5 && (
          <button
            onClick={() => {
              const el = articleRef.current;
              if (!el) return;
              const target = el.offsetTop + (el.scrollHeight * resumeAt) / 100;
              window.scrollTo({ top: target, behavior: "smooth" });
              setResumeAt(null);
            }}
            className="mx-auto mb-8 flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3.5 py-1.5 text-[11px] text-muted transition-colors hover:border-line-strong hover:text-parchment"
          >
            Lanjutkan dari {resumeAt}%
          </button>
        )}

        {chapter ? (
          <article ref={articleRef}>
            <h2 className="mb-6 font-serif text-[22px] text-[#D9CDBA]">{chapter.title}</h2>
            <div
              className="reader"
              style={{
                fontSize: `${prefs.fontSize}px`,
                lineHeight: prefs.lineHeight,
                color: isSepia ? "#E2D6C0" : undefined,
              }}
              dangerouslySetInnerHTML={{ __html: tiptapToHtml(parseDoc(chapter.content)) }}
            />
          </article>
        ) : (
          <p className="text-center text-[13px] text-faint">Belum ada isi untuk dibaca.</p>
        )}

        {/* Chapter navigation */}
        <div className="mt-14 flex items-center justify-between gap-3 border-t border-line pt-6">
          <button
            onClick={() => goChapter(chapterIndex - 1)}
            disabled={chapterIndex === 0}
            className="flex items-center gap-2 text-[11.5px] text-muted transition-colors hover:text-parchment disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="max-w-[140px] truncate text-left">
              {chapters[chapterIndex - 1]?.title ?? "Awal"}
            </span>
          </button>

          <span className="text-[10px] uppercase tracking-[0.16em] text-faint">
            {chapterIndex + 1} / {chapters.length}
          </span>

          <button
            onClick={() => goChapter(chapterIndex + 1)}
            disabled={chapterIndex >= chapters.length - 1}
            className="flex items-center gap-2 text-[11.5px] text-muted transition-colors hover:text-parchment disabled:opacity-30"
          >
            <span className="max-w-[140px] truncate text-right">
              {chapters[chapterIndex + 1]?.title ?? "Akhir"}
            </span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-10 flex items-center justify-center gap-3">
          <Link href={`/studio/${story.id}`}>
            <Button variant="ghost" size="sm">
              Buka di Editor
            </Button>
          </Link>
          <span className="text-[10.5px] text-faint">{chapterWords ? `${formatNumber(chapterWords)} kata di bab ini` : ""}</span>
        </div>
      </div>

      {focusMode && (
        <button
          onClick={() => setFocusMode(false)}
          className="fixed bottom-6 right-6 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-base/90 text-faint backdrop-blur transition-colors hover:text-parchment"
          aria-label="Keluar mode fokus"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function extractText(content: string): string {
  const doc = parseDoc(content);
  const walk = (node: { type?: string; text?: string; content?: unknown[] }): string => {
    if (node.text) return node.text;
    if (!Array.isArray(node.content)) return "";
    return node.content
      .map((child) => walk(child as { type?: string; text?: string; content?: unknown[] }))
      .join(" ");
  };
  return walk(doc as { type?: string; text?: string; content?: unknown[] });
}
