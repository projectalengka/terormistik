"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  AudioLines,
  BookOpen,
  Cpu,
  Mic,
  NotebookPen,
  PenLine,
  Plus,
  Sparkles,
  Upload,
  Video,
} from "lucide-react";
import { useData } from "@/components/providers/data-provider";
import { useAsync } from "@/lib/hooks";
import { useProviders } from "@/lib/use-providers";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, ProgressBar, SectionHeader, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/shell/page-header";
import { StoryCard } from "@/components/story/story-card";
import { CoverArt } from "@/components/story/cover-art";
import { NewStoryDialog } from "@/components/story/new-story-dialog";
import { genreLabel, NOTE_METHODS, statusLabel } from "@/lib/constants";
import { formatNumber, timeAgo, truncate } from "@/lib/utils";
import type { AiHistoryEntry, Note, Story } from "@/lib/types";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
}

const QUICK_ACTIONS = [
  {
    href: null,
    label: "Cerita Baru",
    hint: "Mulai dari naskah kosong",
    icon: PenLine,
    action: "new",
  },
  {
    href: "/capture?mode=voice",
    label: "Rekam Suara",
    hint: "Tangkap cerita lisan",
    icon: Mic,
  },
  {
    href: "/transcription?tab=audio",
    label: "Upload Audio",
    hint: "Transkripsi MP3, WAV, M4A",
    icon: AudioLines,
  },
  {
    href: "/transcription?tab=video",
    label: "Upload Video",
    hint: "Ekstraksi & analisis",
    icon: Video,
  },
] as const;

export default function DashboardPage() {
  const { repo, profile, mode } = useData();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const providers = useProviders();

  const { data, loading, reload } = useAsync(
    async () => {
      const [stories, notes, history] = await Promise.all([
        repo.listStories(),
        repo.listNotes(),
        repo.listAiHistory(12),
      ]);
      return { stories, notes, history };
    },
    [repo]
  );

  const stories = data?.stories ?? [];
  const notes = data?.notes ?? [];
  const history = data?.history ?? [];

  const active = stories.filter((s) => !s.is_archived);
  const stats = {
    stories: active.length,
    drafts: active.filter((s) => s.status === "draft").length,
    rawNotes: notes.filter((n) => n.status === "raw").length,
    words: active.reduce((sum, s) => sum + (s.word_count ?? 0), 0),
  };

  const lastEdited = active[0];
  const recent = active.slice(0, 6);

  const activity = React.useMemo(() => {
    const items: { id: string; at: string; icon: React.ElementType; text: string; href?: string }[] =
      [];
    for (const h of history) {
      items.push({
        id: `ai-${h.id}`,
        at: h.created_at,
        icon: Sparkles,
        text: `AI · ${h.action.replace(/-/g, " ")} (${h.provider})`,
        href: h.story_id ? `/studio/${h.story_id}` : undefined,
      });
    }
    for (const n of notes.slice(0, 8)) {
      items.push({
        id: `note-${n.id}`,
        at: n.created_at,
        icon: NotebookPen,
        text: `Catatan · ${n.title} (${NOTE_METHODS[n.method]})`,
        href: "/capture",
      });
    }
    for (const s of stories.slice(0, 8)) {
      items.push({
        id: `story-${s.id}`,
        at: s.updated_at,
        icon: PenLine,
        text: `Diperbarui · ${s.title}`,
        href: `/studio/${s.id}`,
      });
    }
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
  }, [history, notes, stories]);

  const displayName = profile?.pen_name?.trim() || profile?.display_name?.trim() || "Penulis";
  const today = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const configured = providers.providers.filter((p) => p.configured).length;

  return (
    <>
      <PageHeader
        eyebrow={today}
        title={
          <>
            {greeting()}, <span className="italic text-[#C7B9A3]">{displayName}.</span>
          </>
        }
        description="Arsip Anda menunggu. Setiap rekaman, catatan, dan naskah yang tersimpan di sini adalah cerita yang tidak akan hilang."
        actions={
          <>
            <Button variant="primary" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Cerita Baru
            </Button>
          </>
        }
      />

      {mode === "local" && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[#4E3F2A] bg-[#1C1A14] px-4 py-3">
          <p className="text-[12px] leading-relaxed text-[#D6B98A]">
            <strong className="font-medium">Mode lokal aktif.</strong> Cerita disimpan di peramban
            perangkat ini. Hubungkan Supabase agar arsip tersinkron dan aman.
          </p>
          <Link
            href="/settings/account"
            className="shrink-0 text-[11.5px] uppercase tracking-[0.14em] text-[#D6B98A] underline decoration-[#4E3F2A] underline-offset-4"
          >
            Panduan
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div className="mb-10 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {QUICK_ACTIONS.map((item) => {
          const inner = (
            <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[4px] border border-line bg-[#15151B] p-4 transition-all duration-300 hover:border-line-strong hover:bg-[#191920]">
              <div className="flex items-start justify-between">
                <item.icon
                  className="h-[17px] w-[17px] text-[#8A8073] transition-colors group-hover:text-accent-soft"
                  strokeWidth={1.5}
                />
                <ArrowUpRight className="h-3.5 w-3.5 text-[#3E3A44] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-muted" />
              </div>
              <div className="mt-7">
                <p className="text-[13px] font-medium text-parchment">{item.label}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-faint">{item.hint}</p>
              </div>
              <span className="absolute inset-x-4 bottom-0 h-[1px] origin-left scale-x-0 bg-accent/60 transition-transform duration-500 group-hover:scale-x-100" />
            </div>
          );
          return item.href ? (
            <Link key={item.label} href={item.href} className="block">
              {inner}
            </Link>
          ) : (
            <button key={item.label} onClick={() => setDialogOpen(true)} className="text-left">
              {inner}
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="mb-12 grid grid-cols-2 border-y border-line sm:grid-cols-4">
        {[
          { label: "Cerita", value: stats.stories },
          { label: "Draft", value: stats.drafts },
          { label: "Catatan Mentah", value: stats.rawNotes },
          { label: "Total Kata", value: stats.words },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={[
              "px-4 py-5 first:pl-0 sm:px-6 sm:first:pl-0",
              i % 2 === 1 ? "border-l border-line" : "",
              i >= 2 ? "border-t border-line sm:border-t-0" : "",
              i > 0 ? "sm:border-l sm:border-line" : "",
            ].join(" ")}
          >
            <p className="font-sans text-[28px] font-light leading-none tracking-tight tabular-nums text-parchment">
              {formatNumber(stat.value)}
            </p>
            <p className="mt-2.5 text-[9.5px] uppercase tracking-[0.18em] text-faint">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-8">
        {/* Left column */}
        <div className="space-y-12 lg:col-span-2">
          <section>
            <SectionHeader eyebrow="Lanjutkan" title="Terakhir Anda sentuh" className="mb-5" />
            {loading ? (
              <Skeleton className="h-[190px] w-full" />
            ) : lastEdited ? (
              <Link
                href={`/studio/${lastEdited.id}`}
                className="group flex gap-5 rounded-[5px] border border-line bg-[#15151B] p-4 transition-all duration-300 hover:border-line-strong sm:p-5"
              >
                <CoverArt
                  title={lastEdited.title}
                  genre={lastEdited.genre}
                  coverUrl={lastEdited.cover_url}
                  className="h-[132px] w-[88px] shrink-0 rounded-[2px] sm:h-[164px] sm:w-[110px]"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="accent">{statusLabel(lastEdited.status)}</Badge>
                    <span className="text-[10.5px] uppercase tracking-[0.14em] text-faint">
                      {genreLabel(lastEdited.genre)}
                    </span>
                  </div>
                  <h3 className="mt-2.5 font-serif text-[22px] leading-tight text-parchment transition-colors group-hover:text-white sm:text-[26px]">
                    {lastEdited.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-muted">
                    {lastEdited.synopsis || "Belum ada sinopsis. Buka editor untuk mulai menulis."}
                  </p>
                  <div className="mt-auto flex items-center gap-4 pt-4 text-[11px] text-faint">
                    <span>{formatNumber(lastEdited.word_count)} kata</span>
                    <span className="h-3 w-px bg-line" />
                    <span>{timeAgo(lastEdited.updated_at)}</span>
                  </div>
                </div>
                <div className="hidden shrink-0 flex-col items-end justify-end self-stretch sm:flex">
                  <span className="flex items-center gap-1.5 text-[11.5px] text-[#C9A98A] transition-colors group-hover:text-parchment">
                    {lastEdited.word_count > 0 ? "Lanjutkan" : "Mulai tulis"}{" "}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ) : (
              <EmptyState
                icon={<PenLine className="h-5 w-5" />}
                title="Belum ada cerita"
                description="Mulai dari satu kalimat. Cerita pertama Anda akan tersimpan di sini selamanya."
                action={
                  <Button variant="primary" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4" /> Mulai Cerita Pertama
                  </Button>
                }
              />
            )}
          </section>

          <section>
            <SectionHeader
              eyebrow="Perpustakaan"
              title="Koleksi terbaru"
              className="mb-5"
              action={
                <Link
                  href="/library"
                  className="text-[11px] uppercase tracking-[0.16em] text-faint transition-colors hover:text-parchment"
                >
                  Lihat semua →
                </Link>
              }
            />
            {loading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="aspect-[2/3] w-full" />
                ))}
              </div>
            ) : recent.length ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
                {recent.slice(0, 3).map((story: Story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    onFavorite={async () => {
                      await repo.updateStory(story.id, { is_favorite: !story.is_favorite });
                      reload();
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-faint">Belum ada koleksi.</p>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-10">
          <section className="rounded-[5px] border border-line bg-[#15151B] p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="eyebrow">Aktivitas terakhir</p>
              <Cpu className="h-3.5 w-3.5 text-[#3E3A44]" />
            </div>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : activity.length ? (
              <ul className="space-y-0">
                {activity.map((item) => (
                  <li key={item.id} className="border-b border-line/50 py-2.5 last:border-b-0">
                    {item.href ? (
                      <Link href={item.href} className="group flex items-start gap-2.5">
                        <item.icon className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[#5F584C]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] capitalize text-[#BDB3A3] transition-colors group-hover:text-parchment">
                            {item.text}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-faint">
                            {timeAgo(item.at)}
                          </span>
                        </span>
                      </Link>
                    ) : (
                      <div className="flex items-start gap-2.5">
                        <item.icon className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[#5F584C]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] capitalize text-[#BDB3A3]">
                            {item.text}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-faint">
                            {timeAgo(item.at)}
                          </span>
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-[12.5px] leading-relaxed text-faint">
                Belum ada aktivitas. Mulai dengan menangkap satu catatan atau membuka editor.
              </p>
            )}
          </section>

          <section className="rounded-[5px] border border-line bg-[#15151B] p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="eyebrow">Status AI</p>
              <Link href="/settings/ai" className="text-[10px] uppercase tracking-[0.14em] text-faint hover:text-parchment">
                Kelola
              </Link>
            </div>

            {providers.loading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div className="space-y-2.5">
                  {providers.providers.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.configured ? "bg-[#6FA37F]" : "bg-[#4A4550]"}`}
                        />
                        <span className="truncate text-[12px] text-[#BDB3A3]">{p.label}</span>
                      </div>
                      <span className="shrink-0 text-[10px] uppercase tracking-[0.1em] text-faint">
                        {p.configured ? "Aktif" : "Belum"}
                      </span>
                    </div>
                  ))}
                </div>
                <ProgressBar value={(configured / 3) * 100} className="mt-4" />
                <p className="mt-3 text-[11px] leading-relaxed text-faint">
                  {configured === 0
                    ? "Belum ada provider terhubung. Editor tetap bisa dipakai, tetapi fitur AI nonaktif."
                    : `${configured} dari 3 provider siap digunakan.`}
                </p>
              </>
            )}
          </section>

          <section className="rounded-[5px] border border-line bg-gradient-to-b from-[#1A1518] to-[#15151B] p-5">
            <p className="eyebrow mb-3">Catatan mentah</p>
            <p className="font-sans text-[28px] font-light leading-none tracking-tight tabular-nums text-parchment">
              {formatNumber(stats.rawNotes)}
            </p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
              Catatan yang belum diolah menjadi cerita.
            </p>
            <Link
              href="/capture"
              className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] text-[#C9A98A] transition-colors hover:text-parchment"
            >
              <Upload className="h-3 w-3" /> Tangkap ide baru
            </Link>
          </section>
        </div>
      </div>

      <div className="mt-16 border-t border-line pt-6">
        <p className="text-center font-serif text-[13px] italic text-[#5F584C]">
          &ldquo;Setiap cerita layak diabadikan. Bahkan cerita yang paling gelap sekalipun.&rdquo;
        </p>
      </div>

      <NewStoryDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
