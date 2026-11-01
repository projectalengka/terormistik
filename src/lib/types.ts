export type DataMode = "supabase" | "local";

export type StoryGenre =
  | "horor"
  | "misteri"
  | "supernatural"
  | "thriller"
  | "psychological"
  | "urban-legend"
  | "folklore"
  | "cosmic"
  | "true-horror"
  | "dark-fantasy";

export type StoryStatus = "draft" | "in_progress" | "completed" | "archived";

export type StorySource =
  | "lisan"
  | "pengalaman"
  | "riset"
  | "media"
  | "imajinasi"
  | "lainnya";

export type NoteMethod = "manual" | "voice" | "speech" | "audio" | "video";

export type NoteStatus = "raw" | "processed" | "converted";

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  pen_name: string;
  bio: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Story {
  id: string;
  owner_id: string;
  title: string;
  synopsis: string;
  cover_url: string | null;
  genre: StoryGenre;
  status: StoryStatus;
  source: StorySource;
  word_count: number;
  is_favorite: boolean;
  is_archived: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  story_id: string;
  title: string;
  /** TipTap JSON document, serialised. */
  content: string;
  order_index: number;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  method: NoteMethod;
  status: NoteStatus;
  media_id: string | null;
  story_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaSource {
  id: string;
  owner_id: string;
  kind: "audio" | "video";
  file_name: string;
  mime_type: string;
  size_bytes: number;
  /** Supabase Storage path (supabase mode) or local blob key (local mode). */
  storage_path: string | null;
  source_url: string | null;
  duration_seconds: number | null;
  transcript: string;
  transcript_status: "pending" | "processing" | "done" | "error";
  summary: string;
  key_points: string[];
  provider: string | null;
  created_at: string;
  updated_at: string;
}

export type AiMode = "natural" | "professional";

export type AiActionId =
  | "clean"
  | "narrate"
  | "dramatize"
  | "develop"
  | "chapters"
  | "synopsis"
  | "title"
  | "consistency";

export interface AiHistoryEntry {
  id: string;
  owner_id: string;
  story_id: string | null;
  note_id: string | null;
  action: AiActionId | "transcript-summary" | "video-analysis";
  provider: string;
  model: string;
  mode: AiMode | null;
  input_excerpt: string;
  output: string;
  created_at: string;
}

export interface StoryVersion {
  id: string;
  story_id: string;
  chapter_id: string | null;
  label: string;
  content: string;
  word_count: number;
  source: "manual" | "ai";
  action: string | null;
  created_at: string;
}

export interface ReadingProgress {
  story_id: string;
  chapter_id: string | null;
  percent: number;
  updated_at: string;
}

export interface BackupPayload {
  version: 1;
  exported_at: string;
  mode: DataMode;
  profile: Profile | null;
  stories: Story[];
  chapters: Chapter[];
  notes: Note[];
  media: MediaSource[];
  versions: StoryVersion[];
  ai_history: AiHistoryEntry[];
  progress: ReadingProgress[];
}

export interface DashboardStats {
  stories: number;
  drafts: number;
  rawNotes: number;
  completed: number;
  words: number;
}

export interface ProviderStatus {
  id: string;
  label: string;
  configured: boolean;
  source: "env" | "stored" | null;
  defaultModel: string;
  models: string[];
  purpose: string;
  docsUrl: string;
  freeTierHint?: string;
}
