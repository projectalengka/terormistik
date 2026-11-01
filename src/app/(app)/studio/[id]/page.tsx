"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Cloud,
  Eye,
  Layers,
  Loader2,
  Settings2,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Skeleton } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { Portal } from "@/components/ui/portal";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useData } from "@/components/providers/data-provider";
import { useAsync } from "@/lib/hooks";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { ChapterList } from "@/components/editor/chapter-list";
import { AiPanel } from "@/components/editor/ai-panel";
import { parseChapters } from "@/lib/chapter-utils";
import { GENRES, STATUSES, genreLabel } from "@/lib/constants";
import {
  countWords,
  docFromText,
  formatDateShort,
  formatNumber,
  parseDoc,
  tiptapToHtml,
} from "@/lib/utils";
import type {
  AiActionId,
  Chapter,
  Story,
  StoryGenre,
  StoryStatus,
  StoryVersion,
} from "@/lib/types";

type SaveStatus = "saved" | "dirty" | "saving" | "error";

export default function StoryEditorPage() {
  const params = useParams<{ id: string }>();
  const storyId = params.id;
  const { repo } = useData();
  const toast = useToast();

  const { data, loading, error } = useAsync(async () => {
    const story = await repo.getStory(storyId);
    if (!story) return null;
    const [chapters, versions] = await Promise.all([
      repo.listChapters(storyId),
      repo.listVersions(storyId),
    ]);
    return { story, chapters, versions };
  }, [repo, storyId]);

  const [story, setStory] = React.useState<Story | null>(null);
  const [chapters, setChapters] = React.useState<Chapter[]>([]);
  const [versions, setVersions] = React.useState<StoryVersion[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [wordCount, setWordCount] = React.useState(0);
  const [status, setStatus] = React.useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [mobilePanel, setMobilePanel] = React.useState<"chapters" | "ai" | null>(null);

  const activeIdRef = React.useRef<string | null>(null);
  const loadedRef = React.useRef<string | null>(null);
  const pendingRef = React.useRef<{ chapterId: string; content: string; words: number } | null>(
    null
  );
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUpdateRef = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  React.useEffect(() => {
    if (!data) return;
    setStory(data.story);
    setTitle(data.story?.title ?? "");
    setChapters(data.chapters);
    setVersions(data.versions);
    if (!activeId && data.chapters.length) {
      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem(`tm.chapter.${storyId}`);
      } catch {
        stored = null;
      }
      const target = data.chapters.find((c) => c.id === stored) ?? data.chapters[0];
      setActiveId(target.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  React.useEffect(() => {
    if (!activeId) return;
    try {
      window.localStorage.setItem(`tm.chapter.${storyId}`, activeId);
    } catch {
      /* ignore */
    }
  }, [activeId, storyId]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({
        placeholder: "Mulai menulis… atau tempel cerita lisan Anda di sini.",
      }),
    ],
    content: { type: "doc", content: [{ type: "paragraph" }] },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "tiptap min-h-[58vh] px-5 py-8 outline-none sm:px-10 sm:py-10 lg:min-h-[62vh]",
        spellcheck: "false",
      },
    },
    onUpdate: () => onUpdateRef.current(),
  });

  const flush = React.useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const payload = pendingRef.current;
    if (!payload) return;
    pendingRef.current = null;
    setStatus("saving");
    try {
      await repo.updateChapter(payload.chapterId, {
        content: payload.content,
        word_count: payload.words,
      });
      setChapters((prev) =>
        prev.map((c) =>
          c.id === payload.chapterId
            ? { ...c, content: payload.content, word_count: payload.words }
            : c
        )
      );
      setStatus("saved");
      setSavedAt(new Date());
    } catch {
      pendingRef.current = payload;
      setStatus("error");
    }
  }, [repo]);

  const scheduleSave = React.useCallback(() => {
    if (!editor || !activeIdRef.current) return;
    pendingRef.current = {
      chapterId: activeIdRef.current,
      content: JSON.stringify(editor.getJSON()),
      words: countWords(editor.getText()),
    };
    setWordCount(countWords(editor.getText()));
    setStatus("dirty");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void flush();
    }, 900);
  }, [editor, flush]);

  React.useEffect(() => {
    onUpdateRef.current = scheduleSave;
  }, [scheduleSave]);

  // Load the active chapter into the editor
  React.useEffect(() => {
    if (!editor || !activeId) return;
    if (loadedRef.current === activeId) return;
    const chapter = chapters.find((c) => c.id === activeId);
    if (!chapter) return;
    editor.commands.setContent(parseDoc(chapter.content), false);
    loadedRef.current = activeId;
    setWordCount(countWords(editor.getText()));
    setStatus("saved");
  }, [editor, activeId, chapters]);

  // Flush on unmount / tab hide
  React.useEffect(() => {
    const handler = () => {
      if (pendingRef.current) void flush();
    };
    window.addEventListener("beforeunload", handler);
    document.addEventListener("visibilitychange", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      document.removeEventListener("visibilitychange", handler);
      handler();
    };
  }, [flush]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void flush();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flush]);

  /* ————— Title ————— */

  function onTitleChange(value: string) {
    setTitle(value);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(async () => {
      if (!story) return;
      try {
        const updated = await repo.updateStory(story.id, { title: value.trim() || "Tanpa Judul" });
        setStory(updated);
      } catch {
        /* silent */
      }
    }, 700);
  }

  /* ————— Chapter operations ————— */

  async function selectChapter(nextId: string) {
    if (nextId === activeId) return;
    await flush();
    loadedRef.current = null;
    setActiveId(nextId);
    setMobilePanel(null);
  }

  async function addChapter() {
    await flush();
    try {
      const created = await repo.createChapter(storyId, `Bab ${chapters.length + 1}`);
      setChapters((prev) => [...prev, created]);
      loadedRef.current = null;
      setActiveId(created.id);
      setMobilePanel(null);
      toast.success("Bab baru ditambahkan.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah bab.");
    }
  }

  async function renameChapter(id: string, nextTitle: string) {
    setChapters((prev) => prev.map((c) => (c.id === id ? { ...c, title: nextTitle } : c)));
    try {
      await repo.updateChapter(id, { title: nextTitle });
    } catch {
      toast.error("Gagal mengganti judul bab.");
    }
  }

  async function deleteChapter(id: string) {
    if (chapters.length <= 1) {
      toast.error("Cerita harus memiliki minimal satu bab.");
      return;
    }
    try {
      await repo.deleteChapter(id);
      const fresh = await repo.listChapters(storyId);
      setChapters(fresh);
      if (activeId === id) {
        loadedRef.current = null;
        setActiveId(fresh[0]?.id ?? null);
      }
      toast.success("Bab dihapus.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus bab.");
    }
  }

  async function moveChapter(id: string, direction: -1 | 1) {
    const index = chapters.findIndex((c) => c.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= chapters.length) return;
    const next = [...chapters];
    [next[index], next[target]] = [next[target], next[index]];
    setChapters(next);
    try {
      await repo.reorderChapters(storyId, next.map((c) => c.id));
    } catch {
      toast.error("Gagal mengubah urutan bab.");
    }
  }

  /* ————— AI ————— */

  async function applyAiOutput(output: string) {
    if (!editor) return;
    editor.commands.setContent(docFromText(output), false);
    const words = countWords(editor.getText());
    setWordCount(words);
    if (activeId) {
      pendingRef.current = {
        chapterId: activeId,
        content: JSON.stringify(editor.getJSON()),
        words,
      };
      await flush();
    }
  }

  async function createChaptersFromOutput(output: string) {
    const parsed = parseChapters(output);
    if (!parsed.length) throw new Error("Format bab dari AI tidak dikenali.");
    for (const chapter of parsed) {
      const created = await repo.createChapter(storyId, chapter.title);
      await repo.updateChapter(created.id, {
        content: JSON.stringify(docFromText(chapter.body)),
        word_count: countWords(chapter.body),
      });
    }
    const fresh = await repo.listChapters(storyId);
    setChapters(fresh);
    loadedRef.current = null;
    const firstNew = fresh[fresh.length - parsed.length];
    if (firstNew) setActiveId(firstNew.id);
    toast.success(`${parsed.length} bab dibuat dari hasil AI.`);
  }

  async function saveVersion(output: string, action: AiActionId) {
    const version = await repo.createVersion({
      story_id: storyId,
      chapter_id: activeId,
      label: `AI · ${action}`,
      content: output,
      word_count: countWords(output),
      source: "ai",
      action,
    });
    setVersions((prev) => [version, ...prev]);
  }

  async function restoreVersion(version: StoryVersion) {
    if (!editor) return;
    editor.commands.setContent(parseDoc(version.content), false);
    const words = countWords(editor.getText());
    setWordCount(words);
    if (activeId) {
      pendingRef.current = {
        chapterId: activeId,
        content: JSON.stringify(editor.getJSON()),
        words,
      };
      await flush();
    }
    toast.success("Versi dipulihkan ke editor.");
  }

  async function updateDetail(patch: Partial<Story>) {
    if (!story) return;
    try {
      const updated = await repo.updateStory(story.id, patch);
      setStory(updated);
      toast.success("Detail cerita diperbarui.");
      setDetailOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan detail.");
    }
  }

  /* ————— Render ————— */

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <div className="grid gap-4 lg:grid-cols-[190px_1fr_330px]">
          <Skeleton className="hidden h-[60vh] lg:block" />
          <Skeleton className="h-[60vh]" />
          <Skeleton className="hidden h-[60vh] lg:block" />
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <TriangleAlert className="mb-4 h-6 w-6 text-[#D98A8A]" />
        <p className="font-serif text-2xl text-parchment">Cerita tidak ditemukan</p>
        <p className="mt-2 max-w-sm text-[13px] text-muted">
          {error ?? "Cerita ini mungkin sudah dihapus atau tidak dapat diakses."}
        </p>
        <Link href="/studio" className="mt-6">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Studio
          </Button>
        </Link>
      </div>
    );
  }

  const activeChapter = chapters.find((c) => c.id === activeId);
  const totalWords = chapters.reduce(
    (sum, c) => sum + (c.id === activeId ? wordCount : c.word_count),
    0
  );

  const statusLabel =
    status === "saving"
      ? "Menyimpan…"
      : status === "dirty"
        ? "Belum tersimpan"
        : status === "error"
          ? "Gagal menyimpan"
          : savedAt
            ? `Tersimpan ${savedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
            : "Tersimpan otomatis";

  const chapterPanel = (
    <ChapterList
      chapters={chapters}
      activeId={activeId}
      onSelect={(id) => void selectChapter(id)}
      onAdd={() => void addChapter()}
      onRename={(id, value) => void renameChapter(id, value)}
      onDelete={(id) => void deleteChapter(id)}
      onMove={(id, dir) => void moveChapter(id, dir)}
    />
  );

  const aiPanel = (
    <AiPanel
      storyId={storyId}
      chapterId={activeId}
      title={title}
      getText={() => editor?.getText() ?? ""}
      onAccept={applyAiOutput}
      onSaveVersion={saveVersion}
      onChapters={createChaptersFromOutput}
      versions={versions}
      onRestore={restoreVersion}
      onRefreshVersions={async () => setVersions(await repo.listVersions(storyId))}
    />
  );

  return (
    <>
      {/* Header */}
      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link
            href="/studio"
            className="flex items-center gap-1.5 text-[11.5px] text-faint transition-colors hover:text-parchment"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Studio
          </Link>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Pratinjau</span>
            </Button>
            <Link href={`/library/${story.id}`}>
              <Button variant="ghost" size="sm">
                <BookOpen className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Baca</span>
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => setDetailOpen(true)}>
              <Settings2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Detail</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobilePanel("chapters")}
            >
              <Layers className="h-3.5 w-3.5" /> Bab
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobilePanel("ai")}
            >
              <Sparkles className="h-3.5 w-3.5" /> AI
            </Button>
          </div>
        </div>

        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Judul cerita"
          className="w-full bg-transparent font-serif text-[26px] leading-tight text-parchment outline-none placeholder:text-[#4E4940] sm:text-[34px]"
        />

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-faint">
          <span className="flex items-center gap-1.5">
            {status === "saving" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : status === "error" ? (
              <TriangleAlert className="h-3 w-3 text-[#D98A8A]" />
            ) : status === "dirty" ? (
              <Cloud className="h-3 w-3" />
            ) : (
              <Check className="h-3 w-3 text-[#6FA37F]" />
            )}
            <span className={status === "error" ? "text-[#D98A8A]" : ""}>{statusLabel}</span>
          </span>
          <span className="h-3 w-px bg-line" />
          <span>{formatNumber(totalWords)} kata</span>
          <span className="h-3 w-px bg-line" />
          <span>{chapters.length} bab</span>
          <span className="h-3 w-px bg-line" />
          <span className="hidden sm:inline">Diperbarui {formatDateShort(story.updated_at)}</span>
          <Badge tone="muted" className="ml-auto hidden sm:inline-flex">
            {genreLabel(story.genre)}
          </Badge>
        </div>
      </div>

      {/* Workspace */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[186px_minmax(0,1fr)_326px]">
        <aside className="hidden lg:block">
          <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-[5px] border border-line bg-[#131318] p-2.5">
            {chapterPanel}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="overflow-hidden rounded-[5px] border border-line bg-[#15151B]">
            <EditorToolbar editor={editor} />
            <div className="overflow-visible lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto">
              <EditorContent editor={editor} />
            </div>
            <div className="flex items-center justify-between border-t border-line bg-[#131318] px-4 py-2 text-[10.5px] text-faint">
              <span className="truncate">{activeChapter?.title ?? "—"}</span>
              <span>{formatNumber(wordCount)} kata · {Math.max(1, Math.round(wordCount / 220))} menit baca</span>
            </div>
          </div>
          <p className="mt-2.5 px-1 text-[10.5px] text-faint">
            Tersimpan otomatis setiap jeda pengetikan · Ctrl/⌘ + S untuk menyimpan segera
          </p>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-6 flex h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-[5px] border border-line bg-[#131318]">
            {aiPanel}
          </div>
        </aside>
      </div>

      {/* Mobile drawer */}
      {mobilePanel && (
        <Portal>
          <div className="fixed inset-0 z-[70] lg:hidden">
            <div className="absolute inset-0 bg-black/70" onClick={() => setMobilePanel(null)} />
            <div className="absolute inset-x-0 bottom-0 flex max-h-[86vh] animate-[fade-up_0.28s_cubic-bezier(0.16,1,0.3,1)_both] flex-col rounded-t-[10px] border-t border-line bg-[#131318]">
              <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
                <p className="font-serif text-[16px] text-parchment">
                  {mobilePanel === "chapters" ? "Daftar Bab" : "AI Writing Studio"}
                </p>
                <button
                  onClick={() => setMobilePanel(null)}
                  aria-label="Tutup"
                  className="p-1.5 text-faint"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {mobilePanel === "chapters" ? chapterPanel : aiPanel}
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Preview */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Pratinjau Cerita"
        description="Tampilan seperti yang akan dibaca di mode baca."
        size="lg"
      >
        <article className="reader text-[15px] leading-[1.95]">
          <h1 className="mb-1 font-serif text-[30px] text-parchment">{title}</h1>
          <p className="mb-6 text-[11px] uppercase tracking-[0.18em] text-faint">
            {genreLabel(story.genre)} · {formatNumber(totalWords)} kata
          </p>
          {chapters.map((chapter) => (
            <section key={chapter.id} className="mb-8">
              <h2 className="mb-3 font-serif text-[20px] text-[#D9CDBA]">{chapter.title}</h2>
              <div
                dangerouslySetInnerHTML={{
                  __html: tiptapToHtml(parseDoc(chapter.content)),
                }}
              />
            </section>
          ))}
        </article>
      </Modal>

      {/* Detail */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Detail Cerita"
        description="Metadata yang tampil di perpustakaan dan cover."
        footer={<Button variant="primary" onClick={() => setDetailOpen(false)}>Selesai</Button>}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kategori">
              <Select
                value={story.genre}
                onChange={(e) => void updateDetail({ genre: e.target.value as StoryGenre })}
              >
                {GENRES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={story.status}
                onChange={(e) => void updateDetail({ status: e.target.value as StoryStatus })}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Sinopsis">
            <Textarea
              rows={4}
              defaultValue={story.synopsis}
              onBlur={(e) => {
                if (e.target.value !== story.synopsis) {
                  void updateDetail({ synopsis: e.target.value });
                }
              }}
              placeholder="Ringkasan cerita…"
            />
          </Field>
          <Field label="Tag" hint="pisahkan dengan koma">
            <Input
              defaultValue={story.tags.join(", ")}
              onBlur={(e) => {
                const tags = e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);
                void updateDetail({ tags });
              }}
              placeholder="misalnya: rumah kosong, hujan, suara"
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
