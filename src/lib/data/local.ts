"use client";

import type {
  AiHistoryEntry,
  BackupPayload,
  Chapter,
  MediaSource,
  Note,
  Profile,
  ReadingProgress,
  Story,
  StoryVersion,
} from "../types";
import { emptyDoc, nowIso, uid } from "../utils";
import { idbBulkPut, idbClearAll, idbDelete, idbGet, idbGetAll, idbPut } from "./db";
import type { Repository, UploadResult } from "./repository";

const LOCAL_OWNER = "owner-local";

const DEFAULT_PROFILE: Profile = {
  id: LOCAL_OWNER,
  email: "owner@terormistik.local",
  display_name: "Penulis",
  pen_name: "Tanpa Nama",
  bio: "Penjaga cerita-cerita yang tidak ingin dilupakan.",
  avatar_url: null,
  created_at: nowIso(),
  updated_at: nowIso(),
};

const objectUrls = new Map<string, string>();

function byUpdatedDesc<T extends { updated_at?: string; created_at?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const av = a.updated_at ?? a.created_at ?? "";
    const bv = b.updated_at ?? b.created_at ?? "";
    return bv.localeCompare(av);
  });
}

export class LocalRepository implements Repository {
  readonly mode = "local" as const;

  async getProfile(): Promise<Profile | null> {
    const existing = await idbGet<Profile>("profile", LOCAL_OWNER);
    if (existing) return existing;
    await idbPut("profile", DEFAULT_PROFILE);
    return DEFAULT_PROFILE;
  }

  async updateProfile(patch: Partial<Profile>): Promise<Profile> {
    const current = (await this.getProfile()) ?? DEFAULT_PROFILE;
    const next: Profile = { ...current, ...patch, id: LOCAL_OWNER, updated_at: nowIso() };
    await idbPut("profile", next);
    return next;
  }

  async listStories(): Promise<Story[]> {
    return byUpdatedDesc(await idbGetAll<Story>("stories"));
  }

  async getStory(id: string): Promise<Story | null> {
    return (await idbGet<Story>("stories", id)) ?? null;
  }

  async createStory(input: Partial<Story> & { title: string }): Promise<Story> {
    const ts = nowIso();
    const story: Story = {
      id: uid(),
      owner_id: LOCAL_OWNER,
      title: input.title,
      synopsis: input.synopsis ?? "",
      cover_url: input.cover_url ?? null,
      genre: input.genre ?? "horor",
      status: input.status ?? "draft",
      source: input.source ?? "lisan",
      word_count: 0,
      is_favorite: false,
      is_archived: false,
      tags: input.tags ?? [],
      created_at: ts,
      updated_at: ts,
    };
    await idbPut("stories", story);

    const chapter: Chapter = {
      id: uid(),
      story_id: story.id,
      title: "Bab 1",
      content: JSON.stringify(emptyDoc()),
      order_index: 0,
      word_count: 0,
      created_at: ts,
      updated_at: ts,
    };
    await idbPut("chapters", chapter);
    return story;
  }

  async updateStory(id: string, patch: Partial<Story>): Promise<Story> {
    const current = await this.getStory(id);
    if (!current) throw new Error("Cerita tidak ditemukan.");
    const next: Story = { ...current, ...patch, id, updated_at: nowIso() };
    await idbPut("stories", next);
    return next;
  }

  async deleteStory(id: string): Promise<void> {
    const chapters = await this.listChapters(id);
    for (const c of chapters) await idbDelete("chapters", c.id);
    const versions = await this.listVersions(id);
    for (const v of versions) await idbDelete("versions", v.id);
    await idbDelete("progress", id);
    await idbDelete("stories", id);
  }

  async listChapters(storyId: string): Promise<Chapter[]> {
    const all = await idbGetAll<Chapter>("chapters");
    return all
      .filter((c) => c.story_id === storyId)
      .sort((a, b) => a.order_index - b.order_index);
  }

  async createChapter(storyId: string, title: string): Promise<Chapter> {
    const existing = await this.listChapters(storyId);
    const ts = nowIso();
    const chapter: Chapter = {
      id: uid(),
      story_id: storyId,
      title: title || `Bab ${existing.length + 1}`,
      content: JSON.stringify(emptyDoc()),
      order_index: existing.length ? Math.max(...existing.map((c) => c.order_index)) + 1 : 0,
      word_count: 0,
      created_at: ts,
      updated_at: ts,
    };
    await idbPut("chapters", chapter);
    await this.updateStory(storyId, {});
    return chapter;
  }

  async updateChapter(id: string, patch: Partial<Chapter>): Promise<Chapter> {
    const current = await idbGet<Chapter>("chapters", id);
    if (!current) throw new Error("Bab tidak ditemukan.");
    const next: Chapter = { ...current, ...patch, id, updated_at: nowIso() };
    await idbPut("chapters", next);
    if (patch.content !== undefined || patch.word_count !== undefined) {
      await this.recountStory(current.story_id);
    }
    return next;
  }

  async deleteChapter(id: string): Promise<void> {
    const chapter = await idbGet<Chapter>("chapters", id);
    if (!chapter) return;
    const siblings = await this.listChapters(chapter.story_id);
    if (siblings.length <= 1) throw new Error("Cerita harus memiliki minimal satu bab.");
    await idbDelete("chapters", id);
    await this.recountStory(chapter.story_id);
  }

  async reorderChapters(storyId: string, orderedIds: string[]): Promise<void> {
    const chapters = await this.listChapters(storyId);
    const map = new Map(chapters.map((c) => [c.id, c]));
    const updates: Chapter[] = [];
    orderedIds.forEach((id, index) => {
      const chapter = map.get(id);
      if (chapter) updates.push({ ...chapter, order_index: index, updated_at: nowIso() });
    });
    await idbBulkPut("chapters", updates);
    await this.updateStory(storyId, {});
  }

  async recountStory(storyId: string): Promise<void> {
    const chapters = await this.listChapters(storyId);
    const total = chapters.reduce((sum, c) => sum + (c.word_count ?? 0), 0);
    const story = await this.getStory(storyId);
    if (story && story.word_count !== total) {
      await idbPut("stories", { ...story, word_count: total, updated_at: nowIso() });
    }
  }

  async listNotes(): Promise<Note[]> {
    return byUpdatedDesc(await idbGetAll<Note>("notes"));
  }

  async createNote(input: Partial<Note> & { body: string }): Promise<Note> {
    const ts = nowIso();
    const note: Note = {
      id: uid(),
      owner_id: LOCAL_OWNER,
      title: input.title?.trim() || "Catatan Tanpa Judul",
      body: input.body,
      method: input.method ?? "manual",
      status: input.status ?? "raw",
      media_id: input.media_id ?? null,
      story_id: input.story_id ?? null,
      created_at: ts,
      updated_at: ts,
    };
    await idbPut("notes", note);
    return note;
  }

  async updateNote(id: string, patch: Partial<Note>): Promise<Note> {
    const current = await idbGet<Note>("notes", id);
    if (!current) throw new Error("Catatan tidak ditemukan.");
    const next: Note = { ...current, ...patch, id, updated_at: nowIso() };
    await idbPut("notes", next);
    return next;
  }

  async deleteNote(id: string): Promise<void> {
    await idbDelete("notes", id);
  }

  async listMedia(): Promise<MediaSource[]> {
    return byUpdatedDesc(await idbGetAll<MediaSource>("media"));
  }

  async createMedia(input: Partial<MediaSource> & { file_name: string }): Promise<MediaSource> {
    const ts = nowIso();
    const media: MediaSource = {
      id: uid(),
      owner_id: LOCAL_OWNER,
      kind: input.kind ?? "audio",
      file_name: input.file_name,
      mime_type: input.mime_type ?? "audio/mpeg",
      size_bytes: input.size_bytes ?? 0,
      storage_path: input.storage_path ?? null,
      source_url: input.source_url ?? null,
      duration_seconds: input.duration_seconds ?? null,
      transcript: input.transcript ?? "",
      transcript_status: input.transcript_status ?? "pending",
      summary: input.summary ?? "",
      key_points: input.key_points ?? [],
      provider: input.provider ?? null,
      created_at: ts,
      updated_at: ts,
    };
    await idbPut("media", media);
    return media;
  }

  async updateMedia(id: string, patch: Partial<MediaSource>): Promise<MediaSource> {
    const current = await idbGet<MediaSource>("media", id);
    if (!current) throw new Error("Media tidak ditemukan.");
    const next: MediaSource = { ...current, ...patch, id, updated_at: nowIso() };
    await idbPut("media", next);
    return next;
  }

  async deleteMedia(id: string): Promise<void> {
    const media = await idbGet<MediaSource>("media", id);
    if (media?.storage_path) await this.deleteMediaFile(media.storage_path);
    await idbDelete("media", id);
  }

  async uploadMedia(
    file: File,
    kind: "audio" | "video" | "cover",
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> {
    const id = uid();
    const path = `local/${kind}/${id}-${file.name}`;
    await idbPut("blobs", { id: path, blob: file, mime: file.type, name: file.name });
    onProgress?.(100);
    return { path, size: file.size, mime: file.type };
  }

  async getMediaUrl(item: { storage_path: string | null; source_url: string | null }): Promise<string | null> {
    if (item.source_url) return item.source_url;
    if (!item.storage_path) return null;
    if (item.storage_path.startsWith("data:")) return item.storage_path;
    const cached = objectUrls.get(item.storage_path);
    if (cached) return cached;
    const record = await idbGet<{ id: string; blob: Blob }>("blobs", item.storage_path);
    if (!record?.blob) return null;
    const url = URL.createObjectURL(record.blob);
    objectUrls.set(item.storage_path, url);
    return url;
  }

  async deleteMediaFile(path: string): Promise<void> {
    const cached = objectUrls.get(path);
    if (cached) {
      URL.revokeObjectURL(cached);
      objectUrls.delete(path);
    }
    await idbDelete("blobs", path);
  }

  async listVersions(storyId: string): Promise<StoryVersion[]> {
    const all = await idbGetAll<StoryVersion>("versions");
    return all
      .filter((v) => v.story_id === storyId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async createVersion(input: Omit<StoryVersion, "id" | "created_at">): Promise<StoryVersion> {
    const version: StoryVersion = { ...input, id: uid(), created_at: nowIso() };
    await idbPut("versions", version);
    return version;
  }

  async deleteVersion(id: string): Promise<void> {
    await idbDelete("versions", id);
  }

  async listAiHistory(limit = 40): Promise<AiHistoryEntry[]> {
    const all = await idbGetAll<AiHistoryEntry>("ai_history");
    return all.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  }

  async createAiHistory(
    input: Omit<AiHistoryEntry, "id" | "owner_id" | "created_at">
  ): Promise<AiHistoryEntry> {
    const entry: AiHistoryEntry = {
      ...input,
      id: uid(),
      owner_id: LOCAL_OWNER,
      created_at: nowIso(),
    };
    await idbPut("ai_history", entry);
    return entry;
  }

  async getProgress(storyId: string): Promise<ReadingProgress | null> {
    return (await idbGet<ReadingProgress>("progress", storyId)) ?? null;
  }

  async saveProgress(storyId: string, chapterId: string | null, percent: number): Promise<void> {
    const record: ReadingProgress = {
      story_id: storyId,
      chapter_id: chapterId,
      percent: Math.max(0, Math.min(100, Math.round(percent))),
      updated_at: nowIso(),
    };
    await idbPut("progress", record);
  }

  async exportAll(): Promise<BackupPayload> {
    const [profile, stories, chapters, notes, media, versions, ai_history, progress] =
      await Promise.all([
        this.getProfile(),
        idbGetAll<Story>("stories"),
        idbGetAll<Chapter>("chapters"),
        idbGetAll<Note>("notes"),
        idbGetAll<MediaSource>("media"),
        idbGetAll<StoryVersion>("versions"),
        idbGetAll<AiHistoryEntry>("ai_history"),
        idbGetAll<ReadingProgress>("progress"),
      ]);

    return {
      version: 1,
      exported_at: nowIso(),
      mode: "local",
      profile,
      stories,
      chapters,
      notes,
      media,
      versions,
      ai_history,
      progress,
    };
  }

  async importAll(payload: BackupPayload): Promise<void> {
    await idbClearAll();
    if (payload.profile) await idbPut("profile", { ...payload.profile, id: LOCAL_OWNER });
    await idbBulkPut("stories", payload.stories ?? []);
    await idbBulkPut("chapters", payload.chapters ?? []);
    await idbBulkPut("notes", payload.notes ?? []);
    await idbBulkPut("media", payload.media ?? []);
    await idbBulkPut("versions", payload.versions ?? []);
    await idbBulkPut("ai_history", payload.ai_history ?? []);
    await idbBulkPut("progress", payload.progress ?? []);
  }
}
