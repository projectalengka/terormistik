"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
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
import { emptyDoc, nowIso, safeFileName, uid } from "../utils";
import type { Repository, UploadResult } from "./repository";
import { getSupabaseBrowserClient } from "../supabase/client";

const BUCKET = "media";

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export class SupabaseRepository implements Repository {
  readonly mode = "supabase" as const;
  private client: SupabaseClient;
  private ownerId: string;

  constructor(ownerId: string) {
    this.client = getSupabaseBrowserClient();
    this.ownerId = ownerId;
  }

  async getProfile(): Promise<Profile | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .eq("id", this.ownerId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as Profile;

    const { data: authUser } = await this.client.auth.getUser();
    const fallback: Profile = {
      id: this.ownerId,
      email: authUser.user?.email ?? "",
      display_name: authUser.user?.email?.split("@")[0] ?? "Penulis",
      pen_name: "Tanpa Nama",
      bio: "",
      avatar_url: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    const created = await this.client.from("profiles").upsert(fallback).select().maybeSingle();
    return (created.data as Profile) ?? fallback;
  }

  async updateProfile(patch: Partial<Profile>): Promise<Profile> {
    const { data, error } = await this.client
      .from("profiles")
      .update({ ...patch, updated_at: nowIso() })
      .eq("id", this.ownerId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Profile;
  }

  async listStories(): Promise<Story[]> {
    const { data, error } = await this.client
      .from("stories")
      .select("*")
      .eq("owner_id", this.ownerId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Story[];
  }

  async getStory(id: string): Promise<Story | null> {
    const { data, error } = await this.client.from("stories").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Story) ?? null;
  }

  async createStory(input: Partial<Story> & { title: string }): Promise<Story> {
    const ts = nowIso();
    const payload = {
      id: uid(),
      owner_id: this.ownerId,
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
    const { data, error } = await this.client.from("stories").insert(payload).select().single();
    if (error) throw new Error(error.message);

    await this.client.from("chapters").insert({
      id: uid(),
      story_id: payload.id,
      title: "Bab 1",
      content: JSON.stringify(emptyDoc()),
      order_index: 0,
      word_count: 0,
      created_at: ts,
      updated_at: ts,
    });

    return data as Story;
  }

  async updateStory(id: string, patch: Partial<Story>): Promise<Story> {
    const { data, error } = await this.client
      .from("stories")
      .update({ ...patch, updated_at: nowIso() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Story;
  }

  async deleteStory(id: string): Promise<void> {
    const { error } = await this.client.from("stories").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async listChapters(storyId: string): Promise<Chapter[]> {
    const { data, error } = await this.client
      .from("chapters")
      .select("*")
      .eq("story_id", storyId)
      .order("order_index", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Chapter[];
  }

  async createChapter(storyId: string, title: string): Promise<Chapter> {
    const existing = await this.listChapters(storyId);
    const ts = nowIso();
    const payload = {
      id: uid(),
      story_id: storyId,
      title: title || `Bab ${existing.length + 1}`,
      content: JSON.stringify(emptyDoc()),
      order_index: existing.length ? Math.max(...existing.map((c) => c.order_index)) + 1 : 0,
      word_count: 0,
      created_at: ts,
      updated_at: ts,
    };
    const { data, error } = await this.client.from("chapters").insert(payload).select().single();
    if (error) throw new Error(error.message);
    await this.updateStory(storyId, {});
    return data as Chapter;
  }

  async updateChapter(id: string, patch: Partial<Chapter>): Promise<Chapter> {
    const { data, error } = await this.client
      .from("chapters")
      .update({ ...patch, updated_at: nowIso() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const chapter = data as Chapter;
    if (patch.content !== undefined || patch.word_count !== undefined) {
      await this.recountStory(chapter.story_id);
    }
    return chapter;
  }

  async deleteChapter(id: string): Promise<void> {
    const { data } = await this.client.from("chapters").select("story_id").eq("id", id).maybeSingle();
    const { error } = await this.client.from("chapters").delete().eq("id", id);
    if (error) throw new Error(error.message);
    if (data?.story_id) await this.recountStory(data.story_id as string);
  }

  async reorderChapters(storyId: string, orderedIds: string[]): Promise<void> {
    await Promise.all(
      orderedIds.map((id, index) =>
        this.client.from("chapters").update({ order_index: index }).eq("id", id)
      )
    );
    await this.updateStory(storyId, {});
  }

  async recountStory(storyId: string): Promise<void> {
    const chapters = await this.listChapters(storyId);
    const total = chapters.reduce((sum, c) => sum + (c.word_count ?? 0), 0);
    await this.client.from("stories").update({ word_count: total }).eq("id", storyId);
  }

  async listNotes(): Promise<Note[]> {
    const { data, error } = await this.client
      .from("notes")
      .select("*")
      .eq("owner_id", this.ownerId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Note[];
  }

  async createNote(input: Partial<Note> & { body: string }): Promise<Note> {
    const ts = nowIso();
    const payload = {
      id: uid(),
      owner_id: this.ownerId,
      title: input.title?.trim() || "Catatan Tanpa Judul",
      body: input.body,
      method: input.method ?? "manual",
      status: input.status ?? "raw",
      media_id: input.media_id ?? null,
      story_id: input.story_id ?? null,
      created_at: ts,
      updated_at: ts,
    };
    const { data, error } = await this.client.from("notes").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data as Note;
  }

  async updateNote(id: string, patch: Partial<Note>): Promise<Note> {
    const { data, error } = await this.client
      .from("notes")
      .update({ ...patch, updated_at: nowIso() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Note;
  }

  async deleteNote(id: string): Promise<void> {
    const { error } = await this.client.from("notes").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async listMedia(): Promise<MediaSource[]> {
    const { data, error } = await this.client
      .from("media_sources")
      .select("*")
      .eq("owner_id", this.ownerId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as MediaSource[];
  }

  async createMedia(input: Partial<MediaSource> & { file_name: string }): Promise<MediaSource> {
    const ts = nowIso();
    const payload = {
      id: uid(),
      owner_id: this.ownerId,
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
    const { data, error } = await this.client.from("media_sources").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data as MediaSource;
  }

  async updateMedia(id: string, patch: Partial<MediaSource>): Promise<MediaSource> {
    const { data, error } = await this.client
      .from("media_sources")
      .update({ ...patch, updated_at: nowIso() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as MediaSource;
  }

  async deleteMedia(id: string): Promise<void> {
    const { data } = await this.client
      .from("media_sources")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();
    if (data?.storage_path) await this.deleteMediaFile(data.storage_path as string);
    const { error } = await this.client.from("media_sources").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async uploadMedia(file: File, kind: "audio" | "video" | "cover"): Promise<UploadResult> {
    const path = `${this.ownerId}/${kind}/${Date.now()}-${safeFileName(file.name)}`;
    const { error } = await this.client.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw new Error(error.message);
    return { path, size: file.size, mime: file.type };
  }

  async getMediaUrl(item: {
    storage_path: string | null;
    source_url: string | null;
  }): Promise<string | null> {
    if (item.source_url) return item.source_url;
    if (!item.storage_path) return null;
    const { data, error } = await this.client.storage
      .from(BUCKET)
      .createSignedUrl(item.storage_path, 60 * 60);
    if (error) return null;
    return data?.signedUrl ?? null;
  }

  async deleteMediaFile(path: string): Promise<void> {
    await this.client.storage.from(BUCKET).remove([path]);
  }

  async listVersions(storyId: string): Promise<StoryVersion[]> {
    const { data, error } = await this.client
      .from("story_versions")
      .select("*")
      .eq("story_id", storyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as StoryVersion[];
  }

  async createVersion(input: Omit<StoryVersion, "id" | "created_at">): Promise<StoryVersion> {
    const payload = { ...input, id: uid(), created_at: nowIso() };
    const { data, error } = await this.client
      .from("story_versions")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as StoryVersion;
  }

  async deleteVersion(id: string): Promise<void> {
    const { error } = await this.client.from("story_versions").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async listAiHistory(limit = 40): Promise<AiHistoryEntry[]> {
    const { data, error } = await this.client
      .from("ai_history")
      .select("*")
      .eq("owner_id", this.ownerId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []) as AiHistoryEntry[];
  }

  async createAiHistory(
    input: Omit<AiHistoryEntry, "id" | "owner_id" | "created_at">
  ): Promise<AiHistoryEntry> {
    const payload = { ...input, id: uid(), owner_id: this.ownerId, created_at: nowIso() };
    const { data, error } = await this.client.from("ai_history").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data as AiHistoryEntry;
  }

  async getProgress(storyId: string): Promise<ReadingProgress | null> {
    const { data, error } = await this.client
      .from("reading_progress")
      .select("*")
      .eq("story_id", storyId)
      .maybeSingle();
    if (error) return null;
    return (data as ReadingProgress) ?? null;
  }

  async saveProgress(storyId: string, chapterId: string | null, percent: number): Promise<void> {
    await this.client.from("reading_progress").upsert(
      {
        story_id: storyId,
        owner_id: this.ownerId,
        chapter_id: chapterId,
        percent: Math.max(0, Math.min(100, Math.round(percent))),
        updated_at: nowIso(),
      },
      { onConflict: "story_id" }
    );
  }

  async exportAll(): Promise<BackupPayload> {
    const [profile, stories, notes, media] = await Promise.all([
      this.getProfile(),
      this.listStories(),
      this.listNotes(),
      this.listMedia(),
    ]);

    const chapters: Chapter[] = [];
    const versions: StoryVersion[] = [];
    for (const story of stories) {
      chapters.push(...(await this.listChapters(story.id)));
      versions.push(...(await this.listVersions(story.id)));
    }

    const progress = unwrap(
      await this.client.from("reading_progress").select("*").eq("owner_id", this.ownerId)
    ) as ReadingProgress[];

    return {
      version: 1,
      exported_at: nowIso(),
      mode: "supabase",
      profile,
      stories,
      chapters,
      notes,
      media,
      versions,
      ai_history: await this.listAiHistory(500),
      progress: progress ?? [],
    };
  }

  async importAll(payload: BackupPayload): Promise<void> {
    const ownerId = this.ownerId;
    const stamp = (row: { id: string }) => row.id;

    if (payload.stories?.length) {
      await this.client
        .from("stories")
        .upsert(payload.stories.map((s) => ({ ...s, owner_id: ownerId })));
    }
    if (payload.chapters?.length) {
      await this.client.from("chapters").upsert(payload.chapters.map(stamp));
    }
    if (payload.notes?.length) {
      await this.client.from("notes").upsert(payload.notes.map((n) => ({ ...n, owner_id: ownerId })));
    }
    if (payload.media?.length) {
      await this.client
        .from("media_sources")
        .upsert(payload.media.map((m) => ({ ...m, owner_id: ownerId })));
    }
    if (payload.versions?.length) {
      await this.client.from("story_versions").upsert(payload.versions.map(stamp));
    }
  }
}
